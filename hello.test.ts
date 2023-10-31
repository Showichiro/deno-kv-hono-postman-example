import { app } from "./hello.ts";
import { assert, assertEquals, assertInstanceOf } from "assert";

type User = { id: string; name: string; age: number };

const isStringLiteral = (actual: unknown): actual is string => {
  return typeof actual === "string";
};

Deno.test("GET /users", async () => {
  const res = await app.request("/users", { method: "GET" });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertInstanceOf(json, Array<User>);
});

Deno.test("GET /users/:id", async (t) => {
  await t.step("found", async () => {
    const users = await app.request("/users", { method: "GET" });
    const usersBody = await users.json();
    const userId = usersBody[0].id as string;
    const res = await app.request(`/users/${userId}`, { method: "GET" });
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json, usersBody[0]);
  });

  await t.step("not found", async () => {
    const res = await app.request(`/users/invalid`, { method: "GET" });
    assertEquals(res.status, 404);
    const json = await res.json();
    assertEquals(json, { message: "Not Found" });
  });
});

Deno.test("POST /users", async (t) => {
  await t.step("valid request", async () => {
    const res = await app.request("users", {
      method: "POST",
      body: JSON.stringify({
        name: "test",
        age: 10,
      }),
      headers: {
        "content-type": "application/json",
      },
    });
    assertEquals(res.status, 201);
    const json = await res.json();
    assert(isStringLiteral(json.id));
    assertEquals(json.name, "test");
    assertEquals(json.age, 10);
  });

  await t.step("bad request", async (t) => {
    await t.step("type error", async () => {
      const res = await app.request("users", {
        method: "POST",
        body: JSON.stringify({
          name: 12,
          age: "test",
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, { message: "Invalid Request" });
    });

    await t.step("without age", async () => {
      const res = await app.request("users", {
        method: "POST",
        body: JSON.stringify({
          name: "test",
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, { message: "Invalid Request" });
    });

    await t.step("without name", async () => {
      const res = await app.request("users", {
        method: "POST",
        body: JSON.stringify({
          age: 10,
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, { message: "Invalid Request" });
    });

    await t.step("without body", async () => {
      const res = await app.request("users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, {
        success: false,
        message: "Malformed JSON in request body",
      });
    });

    await t.step("without content-type", async () => {
      const res = await app.request("users", {
        method: "POST",
        body: JSON.stringify({
          name: "test",
          age: 10,
        }),
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, {
        success: false,
        message: "Malformed JSON in request body",
      });
    });
  });
});

Deno.test("PUT /users/:id", async (t) => {
  await t.step("valid request", async (t) => {
    await t.step("with name and age", async () => {
      const users = await app.request("/users", { method: "GET" });
      const usersBody = await users.json();
      const userId = usersBody[0].id as string;
      const res = await app.request(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: "test",
          age: 12,
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body, null);
    });

    await t.step("with name", async () => {
      const users = await app.request("/users", { method: "GET" });
      const usersBody = await users.json();
      const userId = usersBody[0].id as string;
      const res = await app.request(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: "test",
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body, null);
    });

    await t.step("with age", async () => {
      const users = await app.request("/users", { method: "GET" });
      const usersBody = await users.json();
      const userId = usersBody[0].id as string;
      const res = await app.request(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          age: 12,
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body, null);
    });

    await t.step("with empty object", async () => {
      const users = await app.request("/users", { method: "GET" });
      const usersBody = await users.json();
      const userId = usersBody[0].id as string;
      const res = await app.request(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body, null);
    });
  });

  await t.step("bad request", async (t) => {
    await t.step("type error", async () => {
      const res = await app.request("users", {
        method: "POST",
        body: JSON.stringify({
          name: 12,
          age: "test",
        }),
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, { message: "Invalid Request" });
    });

    await t.step("without body", async () => {
      const res = await app.request("users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, {
        success: false,
        message: "Malformed JSON in request body",
      });
    });

    await t.step("without content-type", async () => {
      const res = await app.request("users", {
        method: "POST",
        body: JSON.stringify({
          name: "test",
          age: 10,
        }),
      });
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json, {
        success: false,
        message: "Malformed JSON in request body",
      });
    });
  });
});

Deno.test("DELETE /users/:id", async (t) => {
  await t.step("valid request", async (t) => {
    await t.step("with name and age", async () => {
      const users = await app.request("/users", { method: "GET" });
      const usersBody = await users.json();
      const userId = usersBody[0].id as string;
      const res = await app.request(`/users/${userId}`, {
        method: "DELETE",
      });
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body, null);
    });
  });

  await t.step("bad request", async (t) => {
    await t.step("invalid userId", async () => {
      const res = await app.request(`/users/invalid`, {
        method: "DELETE",
      });
      assertEquals(res.status, 400);
      const body = await res.json();
      assertEquals(body, { message: "Invalid Request" });
    });
  });
});
