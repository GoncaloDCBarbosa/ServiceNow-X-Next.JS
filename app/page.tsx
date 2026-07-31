"use client";

import { useState } from "react";

export default function Home() {
  const [users, setUsers] = useState<any[]>([]);

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();

    setUsers(data.result);
  }

  return (
    <main style={{ padding: 30 }}>
      <h1>ServiceNow PoC</h1>

      <button onClick={loadUsers}>Ver Users</button>

      <table
        style={{
          marginTop: 20,
          borderCollapse: "collapse",
          width: "100%",
        }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid gray", padding: 8 }}>Nome</th>
            <th style={{ border: "1px solid gray", padding: 8 }}>User ID</th>
            <th style={{ border: "1px solid gray", padding: 8 }}>Ativo</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.sys_id}>
              <td style={{ border: "1px solid gray", padding: 8 }}>
                {user.name}
              </td>

              <td style={{ border: "1px solid gray", padding: 8 }}>
                {user.user_name}
              </td>

              <td style={{ border: "1px solid gray", padding: 8 }}>
                {user.active === "true" ? "✅" : "❌"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}