/// <reference lib="deno.unstable" />
import { Hono, validator } from "https://deno.land/x/hono@v3.9.0/mod.ts";
import { monotonicFactory } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

// drop table
try {
  await Deno.remove("kv.sqlite");
} catch (err) {
  if (!(err instanceof Deno.errors.NotFound)) {
    throw err;
  }
}

const ulid = monotonicFactory();

const kv = await Deno.openKv("kv.sqlite");

type User = {
  name: string;
  age: number;
};

// crud methods
const addUser = async (user: User) => {
  const id = ulid();
  const primaryKey = ["users", "id", id];
  return {
    result: await kv.atomic().check({ key: primaryKey, versionstamp: null })
      .set(primaryKey, user).commit(),
    id,
  };
};

const findAllUsers = async () => {
  const entries = kv.list<User>({
    prefix: ["users", "id"],
  });
  let res: Array<User & { id: string }> = [];
  for await (const entry of entries) {
    res = [...res, { ...entry.value, id: entry.key[2] as string }];
  }
  return res;
};

const findUserById = async (id: string): Promise<User | null> => {
  const { value } = await kv.get<User>(["users", "id", id]);
  return value;
};

const updateUser = async (id: string, value: Partial<User>) => {
  const user = await findUserById(id);
  if (!user) {
    return false;
  }
  const key = ["users", "id", id];
  const { ok } = await kv.set(key, { ...user, ...value });
  return ok;
};

const deleteUser = async (id: string) => {
  const user = await findUserById(id);
  if (!user) {
    return false;
  }
  const key = ["users", "id", id];
  await kv.delete(key);
  return true;
};

// insert initial data
await addUser({
  name: "Harmon",
  age: 25,
});
await addUser({
  name: "Wheeler",
  age: 26,
});
await addUser({
  name: "Parks",
  age: 27,
});

type PostUserRequest = User;

const isPostUserRequest = (val: unknown): val is PostUserRequest => {
  return typeof val === "object" && !!val && "name" in val && "age" in val &&
    typeof val.name === "string" && typeof val.age === "number";
};

type Error = {
  message: string;
};

const badRequest: Error = {
  message: "Invalid Request",
} as const;

const notFound: Error = {
  message: "Not Found",
};
const internalServerError: Error = {
  message: "Internal Server Error",
};

type PutUserRequest = Partial<User>;

const isPutUserRequest = (val: unknown): val is PutUserRequest => {
  return typeof val === "object";
};

// server
const app = new Hono();

app.get(
  "/users",
  async (c) => {
    const res = await findAllUsers();
    return c.json(res);
  },
).get("/users/:id", async (c) => {
  const id = c.req.param("id");
  const value = await findUserById(id);
  return value ? c.json({ ...value, id }) : c.json(notFound, 404);
}).post(
  "/users",
  validator("json", (value, c) => {
    return isPostUserRequest(value) ? value : c.json(badRequest, 400);
  }),
  async (c) => {
    const { name, age } = c.req.valid("json");
    const { result, id } = await addUser({ name, age });
    if (result.ok) {
      return c.json({ name, age, id }, 201);
    }
    return c.json(internalServerError, 500);
  },
).put(
  "/users/:id",
  validator("json", (value, c) => {
    return isPutUserRequest(value) ? value : c.json(badRequest, 400);
  }),
  async (c) => {
    const id = c.req.param("id");
    const value = c.req.valid("json");
    const isUpdated = await updateUser(id, value);
    return isUpdated ? c.json(null) : c.json(badRequest, 400);
  },
).delete(
  "/users/:id",
  async (c) => {
    const id = c.req.param("id");
    const result = await deleteUser(id);
    return result ? c.json(null) : c.json(badRequest, 400);
  },
);

Deno.serve(app.fetch);
