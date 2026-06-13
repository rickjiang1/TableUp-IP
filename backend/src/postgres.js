import { pbkdf2Sync, randomBytes, createHash, createHmac } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

const sslRequestCode = 80877103;
const protocolVersion = 196608;

export async function query(sql) {
  const connection = await connect();
  try {
    connection.sendQuery(sql);
    return await connection.readQueryResult();
  } finally {
    connection.close();
  }
}

export function sqlString(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

export function sqlNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(fallback);
}

export function sqlBoolean(value) {
  return value ? "true" : "false";
}

export function sqlBytea(buffer) {
  return `decode('${Buffer.from(buffer).toString("hex")}', 'hex')`;
}

async function connect() {
  const config = postgresConfig();
  const socket = await connectSocket(config);
  const reader = new SocketReader(socket);
  await startup(socket, reader, config);
  return new PostgresConnection(socket, reader);
}

function postgresConfig() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("Supabase is not configured. Add SUPABASE_DATABASE_URL to backend/.env.");
  }

  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, "") || "postgres"),
    forceIPv4: String(process.env.POSTGRES_FORCE_IPV4 || "true").toLowerCase() !== "false",
    sslRejectUnauthorized: String(process.env.SUPABASE_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true"
  };
}

async function connectSocket(config) {
  const rawSocket = await new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.host,
      port: config.port,
      ...(config.forceIPv4 ? { family: 4 } : {})
    }, () => resolve(socket));
    socket.setTimeout(20_000, () => reject(new Error("Postgres connection timed out.")));
    socket.once("error", reject);
  });

  rawSocket.write(Buffer.concat([packInt32(8), packInt32(sslRequestCode)]));

  const response = await readExactly(rawSocket, 1);
  if (response.toString("utf8") !== "S") {
    throw new Error(`Postgres server did not accept SSL: ${response.toString("hex")}.`);
  }

  return await new Promise((resolve, reject) => {
    const socket = tls.connect({
      socket: rawSocket,
      servername: config.host,
      rejectUnauthorized: config.sslRejectUnauthorized
    }, () => resolve(socket));
    socket.once("error", reject);
  });
}

async function startup(socket, reader, config) {
  const params = Buffer.concat([
    cstring("user"),
    cstring(config.user),
    cstring("database"),
    cstring(config.database),
    Buffer.from([0])
  ]);
  socket.write(Buffer.concat([packInt32(params.length + 8), packInt32(protocolVersion), params]));

  while (true) {
    const message = await reader.readMessage();
    if (message.type === "R") {
      const authCode = message.payload.readUInt32BE(0);
      if (authCode === 0) {
        continue;
      }
      if (authCode === 10) {
        await authenticateScram(socket, reader, config);
        continue;
      }
      throw new Error(`Unsupported Postgres auth code ${authCode}.`);
    }
    if (message.type === "E") {
      throw new Error(parseError(message.payload));
    }
    if (message.type === "Z") {
      return;
    }
  }
}

async function authenticateScram(socket, reader, config) {
  const nonce = randomBytes(18).toString("base64url");
  const clientFirstBare = `n=${escapeScram(config.user)},r=${nonce}`;
  const clientFirst = `n,,${clientFirstBare}`;
  sendMessage(socket, "p", Buffer.concat([
    cstring("SCRAM-SHA-256"),
    packInt32(Buffer.byteLength(clientFirst)),
    Buffer.from(clientFirst)
  ]));

  const continueMessage = await reader.readMessage();
  if (continueMessage.type !== "R" || continueMessage.payload.readUInt32BE(0) !== 11) {
    throw new Error("Unexpected Postgres SASL continue message.");
  }

  const serverFirst = continueMessage.payload.slice(4).toString("utf8");
  const parts = Object.fromEntries(serverFirst.split(",").map((part) => part.split(/=(.*)/s).slice(0, 2)));
  const clientFinalWithoutProof = `c=biws,r=${parts.r}`;
  const authMessage = `${clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;
  const saltedPassword = pbkdf2Sync(config.password, Buffer.from(parts.s, "base64"), Number(parts.i), 32, "sha256");
  const clientKey = hmac(saltedPassword, "Client Key");
  const storedKey = hash(clientKey);
  const clientSignature = hmac(storedKey, authMessage);
  const proof = Buffer.alloc(clientKey.length);
  for (let index = 0; index < clientKey.length; index += 1) {
    proof[index] = clientKey[index] ^ clientSignature[index];
  }

  sendMessage(socket, "p", Buffer.from(`${clientFinalWithoutProof},p=${proof.toString("base64")}`));
  const finalMessage = await reader.readMessage();
  if (finalMessage.type !== "R" || finalMessage.payload.readUInt32BE(0) !== 12) {
    throw new Error("Postgres password authentication failed.");
  }
}

class PostgresConnection {
  constructor(socket, reader) {
    this.socket = socket;
    this.reader = reader;
  }

  sendQuery(sql) {
    sendMessage(this.socket, "Q", Buffer.concat([Buffer.from(sql), Buffer.from([0])]));
  }

  async readQueryResult() {
    let columns = [];
    const rows = [];

    while (true) {
      const message = await this.reader.readMessage();
      if (message.type === "T") {
        columns = parseRowDescription(message.payload);
      } else if (message.type === "D") {
        rows.push(parseDataRow(message.payload, columns));
      } else if (message.type === "E") {
        throw new Error(parseError(message.payload));
      } else if (message.type === "Z") {
        return rows;
      }
    }
  }

  close() {
    sendMessage(this.socket, "X", Buffer.alloc(0));
    this.socket.end();
  }
}

class SocketReader {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.flush();
    });
    socket.on("error", (error) => this.rejectAll(error));
    socket.on("end", () => this.rejectAll(new Error("Postgres connection closed.")));
  }

  async readMessage() {
    const header = await this.read(5);
    const type = header.slice(0, 1).toString("utf8");
    const length = header.readUInt32BE(1);
    const payload = await this.read(length - 4);
    return { type, payload };
  }

  read(length) {
    if (this.buffer.length >= length) {
      const output = this.buffer.slice(0, length);
      this.buffer = this.buffer.slice(length);
      return Promise.resolve(output);
    }

    return new Promise((resolve, reject) => {
      this.waiters.push({ length, resolve, reject });
      this.flush();
    });
  }

  flush() {
    while (this.waiters.length > 0 && this.buffer.length >= this.waiters[0].length) {
      const waiter = this.waiters.shift();
      const output = this.buffer.slice(0, waiter.length);
      this.buffer = this.buffer.slice(waiter.length);
      waiter.resolve(output);
    }
  }

  rejectAll(error) {
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(error);
    }
  }
}

function parseRowDescription(payload) {
  const count = payload.readUInt16BE(0);
  let offset = 2;
  const columns = [];
  for (let index = 0; index < count; index += 1) {
    const nameEnd = payload.indexOf(0, offset);
    const name = payload.slice(offset, nameEnd).toString("utf8");
    offset = nameEnd + 19;
    columns.push(name);
  }
  return columns;
}

function parseDataRow(payload, columns) {
  const count = payload.readUInt16BE(0);
  let offset = 2;
  const row = {};
  for (let index = 0; index < count; index += 1) {
    const length = payload.readInt32BE(offset);
    offset += 4;
    if (length === -1) {
      row[columns[index]] = null;
    } else {
      row[columns[index]] = payload.slice(offset, offset + length).toString("utf8");
      offset += length;
    }
  }
  return row;
}

function parseError(payload) {
  const fields = {};
  let offset = 0;
  while (offset < payload.length && payload[offset] !== 0) {
    const type = String.fromCharCode(payload[offset]);
    const end = payload.indexOf(0, offset + 1);
    fields[type] = payload.slice(offset + 1, end).toString("utf8");
    offset = end + 1;
  }
  return fields.M || "Postgres error";
}

async function readExactly(socket, length) {
  const reader = new SocketReader(socket);
  return reader.read(length);
}

function sendMessage(socket, type, payload) {
  socket.write(Buffer.concat([Buffer.from(type), packInt32(payload.length + 4), payload]));
}

function packInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function cstring(value) {
  return Buffer.from(`${value}\0`, "utf8");
}

function hmac(key, message) {
  return createHmac("sha256", key).update(message).digest();
}

function hash(value) {
  return createHash("sha256").update(value).digest();
}

function escapeScram(value) {
  return String(value).replaceAll("=", "=3D").replaceAll(",", "=2C");
}
