const assert = require("node:assert/strict");
const test = require("node:test");

function loadCrudController({ query, canMutateRecord = async () => true } = {}) {
  const dbPath = require.resolve("../config/db");
  const authPath = require.resolve("../middleware/authorization");
  const factoryPath = require.resolve("../utils/crudFactory");

  delete require.cache[factoryPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { query },
  };
  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      canAccessPlayer: async () => true,
      canAccessRecord: async () => true,
      canAccessTeam: async () => true,
      canMutateRecord,
      isSelf: (user, userId) => String(user.id) === String(userId),
    },
  };

  return require("../utils/crudFactory");
}

function createRes() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("user profile update ignores read-only role and is_active fields from full user payloads", async () => {
  const calls = [];
  const query = async (sql, params) => {
    calls.push({ sql, params });

    if (sql.startsWith("UPDATE")) {
      return { affectedRows: 1 };
    }

    return [{
      id: 7,
      name: "Updated Player",
      email: "player@example.com",
      role: "player",
      is_active: 1,
    }];
  };
  const createCrudController = loadCrudController({ query });
  const tables = require("../utils/tableConfig");
  const controller = createCrudController(tables.users);
  const res = createRes();

  await controller.update({
    user: { id: 7, role: "player" },
    params: { id: "7" },
    body: {
      name: "Updated Player",
      role: "coach",
      is_active: false,
    },
  }, res);

  const updateCall = calls.find((call) => call.sql.startsWith("UPDATE"));

  assert.equal(res.statusCode, 200);
  assert.match(updateCall.sql, /SET `name` = \?/);
  assert.doesNotMatch(updateCall.sql, /`role`/);
  assert.doesNotMatch(updateCall.sql, /`is_active`/);
  assert.deepEqual(updateCall.params, ["Updated Player", "7"]);
});

test("coach can update a linked trainer name only", async () => {
  const calls = [];
  const query = async (sql, params) => {
    calls.push({ sql, params });

    if (sql.startsWith("SELECT role FROM users")) {
      return [{ role: "trainer" }];
    }

    if (sql.startsWith("UPDATE")) {
      return { affectedRows: 1 };
    }

    return [{
      id: 12,
      name: "Renamed Trainer",
      email: "trainer@example.com",
      role: "trainer",
    }];
  };
  const createCrudController = loadCrudController({ query, canMutateRecord: async () => true });
  const tables = require("../utils/tableConfig");
  const controller = createCrudController(tables.users);
  const res = createRes();

  await controller.update({
    user: { id: 3, role: "coach" },
    params: { id: "12" },
    body: { name: "Renamed Trainer" },
  }, res);

  const updateCall = calls.find((call) => call.sql.startsWith("UPDATE"));

  assert.equal(res.statusCode, 200);
  assert.match(updateCall.sql, /SET `name` = \?/);
  assert.deepEqual(updateCall.params, ["Renamed Trainer", "12"]);
});

test("coach cannot update linked trainer fields other than name", async () => {
  const query = async (sql) => {
    if (sql.startsWith("SELECT role FROM users")) {
      return [{ role: "trainer" }];
    }

    return [];
  };
  const createCrudController = loadCrudController({ query, canMutateRecord: async () => true });
  const tables = require("../utils/tableConfig");
  const controller = createCrudController(tables.users);

  await assert.rejects(
    () => controller.update({
      user: { id: 3, role: "coach" },
      params: { id: "12" },
      body: { name: "Renamed Trainer", email: "new@example.com" },
    }, createRes()),
    {
      statusCode: 403,
      message: "Coach can only update trainer name. Cannot modify: email",
    }
  );
});
