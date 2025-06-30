import React, { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { VendorURL, CredentialPair, ProxySetting, Task } from "../../types";
import toast from "react-hot-toast";
import { Link } from "lucide-react";

type Selectable<T> = T & { selected?: boolean };

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function DataStore() {
  const [vendors, setVendors] = useState<Selectable<VendorURL>[]>([]);
  const [credentials, setCredentials] = useState<Selectable<CredentialPair>[]>(
    [],
  );
  const [proxies, setProxies] = useState<Selectable<ProxySetting>[]>([]);
  const [tasks, setTasks] = useState<Selectable<Task>[]>([]);

  const [newVendor, setNewVendor] = useState("");
  const [newCred, setNewCred] = useState({ login: "", password: "" });
  const [newProxy, setNewProxy] = useState({
    address: "",
    username: "",
    password: "",
  });
  const [newTask, setNewTask] = useState({ vpn_type: "", server: "" });

  const loadAll = async () => {
    try {
      const [v, c, p, t] = await Promise.all([
        fetchJSON("/api/vendor_urls"),
        fetchJSON("/api/credentials"),
        fetchJSON("/api/proxies"),
        fetchJSON("/api/tasks"),
      ]);
      setVendors(v.data || []);
      setCredentials(c.data || []);
      setProxies(p.data || []);
      setTasks(t.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load data");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const addVendor = async () => {
    if (!newVendor) return;
    try {
      const res = await fetchJSON("/api/vendor_urls", {
        method: "POST",
        body: JSON.stringify({ url: newVendor }),
      });
      setVendors([...vendors, res.data]);
      setNewVendor("");
      toast.success("Vendor added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addCred = async () => {
    if (!newCred.login || !newCred.password) return;
    try {
      const res = await fetchJSON("/api/credentials", {
        method: "POST",
        body: JSON.stringify(newCred),
      });
      setCredentials([...credentials, res.data]);
      setNewCred({ login: "", password: "" });
      toast.success("Credential added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addProxy = async () => {
    if (!newProxy.address) return;
    try {
      const res = await fetchJSON("/api/proxies", {
        method: "POST",
        body: JSON.stringify(newProxy),
      });
      setProxies([...proxies, res.data]);
      setNewProxy({ address: "", username: "", password: "" });
      toast.success("Proxy added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addTask = async () => {
    if (!newTask.vpn_type) return;
    try {
      const res = await fetchJSON("/api/tasks", {
        method: "POST",
        body: JSON.stringify(newTask),
      });
      setTasks([...tasks, res.data]);
      setNewTask({ vpn_type: "", server: "" });
      toast.success("Task added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateItem = async <T extends { id: number }>(
    path: string,
    item: Selectable<T>,
    list: Selectable<T>[],
    setList: (l: Selectable<T>[]) => void,
  ) => {
    try {
      await fetchJSON(`${path}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(item),
      });
      setList(list.map((i) => (i.id === item.id ? item : i)));
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteItem = async <T extends { id: number }>(
    path: string,
    id: number,
    list: Selectable<T>[],
    setList: (l: Selectable<T>[]) => void,
  ) => {
    try {
      await fetchJSON(`${path}/${id}`, { method: "DELETE" });
      setList(list.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const bulkDelete = async <T extends { id: number }>(
    path: string,
    list: Selectable<T>[],
    setList: (l: Selectable<T>[]) => void,
  ) => {
    const ids = list.filter((i) => i.selected).map((i) => i.id);
    if (ids.length === 0) return;
    try {
      await fetchJSON(`${path}/bulk_delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      setList(list.filter((i) => !ids.includes(i.id)));
      toast.success("Deleted selected");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSelect = <T extends { id: number }>(
    id: number,
    list: Selectable<T>[],
    setList: (l: Selectable<T>[]) => void,
  ) => {
    setList(
      list.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)),
    );
  };

  const renderSection = <T extends { id: number }>(
    title: string,
    list: Selectable<T>[],
    setList: (l: Selectable<T>[]) => void,
    fields: (
      item: Selectable<T>,
      onChange: (v: Partial<T>) => void,
    ) => React.ReactNode,
    addForm: React.ReactNode,
    path: string,
  ) => (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Link className="h-4 w-4 mr-2" />
        {title}
      </h3>
      {addForm}
      <table className="w-full mt-4 text-sm">
        <thead>
          <tr className="text-left">
            <th></th>
            <th className="px-2">ID</th>
            <th className="px-2">Data</th>
            <th className="px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="px-2">
                <input
                  type="checkbox"
                  checked={!!item.selected}
                  onChange={() => toggleSelect(item.id, list, setList)}
                />
              </td>
              <td className="px-2">{item.id}</td>
              <td className="px-2">
                {fields(item, (v) =>
                  setList(
                    list.map((i) => (i.id === item.id ? { ...i, ...v } : i)),
                  ),
                )}
              </td>
              <td className="px-2 space-x-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => updateItem(path, item, list, setList)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteItem(path, item.id, list, setList)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2">
        <Button
          size="sm"
          variant="error"
          onClick={() => bulkDelete(path, list, setList)}
        >
          Delete Selected
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderSection(
        "Vendor URLs",
        vendors,
        setVendors,
        (item, onChange) => (
          <input
            className="w-full border p-1"
            value={item.url}
            onChange={(e) => onChange({ url: e.target.value })}
          />
        ),
        <div className="flex space-x-2">
          <input
            className="flex-1 border p-2"
            placeholder="https://example.com"
            value={newVendor}
            onChange={(e) => setNewVendor(e.target.value)}
          />
          <Button onClick={addVendor}>Add</Button>
        </div>,
        "/api/vendor_urls",
      )}

      {renderSection(
        "Credentials",
        credentials,
        setCredentials,
        (item, onChange) => (
          <div className="flex space-x-2">
            <input
              className="border p-1 flex-1"
              value={item.login}
              onChange={(e) => onChange({ login: e.target.value })}
              placeholder="login"
            />
            <input
              className="border p-1 flex-1"
              value={item.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="password"
            />
          </div>
        ),
        <div className="flex space-x-2">
          <input
            className="border p-2 flex-1"
            placeholder="login"
            value={newCred.login}
            onChange={(e) =>
              setNewCred((prev) => ({ ...prev, login: e.target.value }))
            }
          />
          <input
            className="border p-2 flex-1"
            placeholder="password"
            value={newCred.password}
            onChange={(e) =>
              setNewCred((prev) => ({ ...prev, password: e.target.value }))
            }
          />
          <Button onClick={addCred}>Add</Button>
        </div>,
        "/api/credentials",
      )}

      {renderSection(
        "Proxy Settings",
        proxies,
        setProxies,
        (item, onChange) => (
          <div className="flex space-x-2">
            <input
              className="border p-1 flex-1"
              value={item.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="host:port"
            />
            <input
              className="border p-1 flex-1"
              value={item.username || ""}
              onChange={(e) => onChange({ username: e.target.value })}
              placeholder="user"
            />
            <input
              className="border p-1 flex-1"
              value={item.password || ""}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="pass"
            />
          </div>
        ),
        <div className="flex space-x-2">
          <input
            className="border p-2 flex-1"
            placeholder="host:port"
            value={newProxy.address}
            onChange={(e) =>
              setNewProxy((prev) => ({ ...prev, address: e.target.value }))
            }
          />
          <input
            className="border p-2 flex-1"
            placeholder="user"
            value={newProxy.username}
            onChange={(e) =>
              setNewProxy((prev) => ({ ...prev, username: e.target.value }))
            }
          />
          <input
            className="border p-2 flex-1"
            placeholder="pass"
            value={newProxy.password}
            onChange={(e) =>
              setNewProxy((prev) => ({ ...prev, password: e.target.value }))
            }
          />
          <Button onClick={addProxy}>Add</Button>
        </div>,
        "/api/proxies",
      )}

      {renderSection(
        "Tasks",
        tasks,
        setTasks,
        (item, onChange) => (
          <div className="flex space-x-2">
            <input
              className="border p-1 flex-1"
              value={item.vpn_type || ""}
              onChange={(e) => onChange({ vpn_type: e.target.value })}
              placeholder="vpn"
            />
            <input
              className="border p-1 flex-1"
              value={item.server || ""}
              onChange={(e) => onChange({ server: e.target.value })}
              placeholder="server"
            />
            <input
              className="border p-1 flex-1"
              value={item.status || ""}
              onChange={(e) => onChange({ status: e.target.value })}
              placeholder="status"
            />
          </div>
        ),
        <div className="flex space-x-2">
          <input
            className="border p-2 flex-1"
            placeholder="vpn"
            value={newTask.vpn_type}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, vpn_type: e.target.value }))
            }
          />
          <input
            className="border p-2 flex-1"
            placeholder="server"
            value={newTask.server}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, server: e.target.value }))
            }
          />
          <Button onClick={addTask}>Add</Button>
        </div>,
        "/api/tasks",
      )}
    </div>
  );
}
