import React, { useEffect, useState } from 'react';
import { Task } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ vpn_type: '', server: '' });

  const loadTasks = async () => {
    try {
      const res = await fetchJSON('/api/tasks');
      setTasks(res.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load tasks');
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async () => {
    if (!newTask.vpn_type) return;
    try {
      const res = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });
      setTasks([...tasks, res.data]);
      setNewTask({ vpn_type: '', server: '' });
      toast.success('Task added');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateTask = async (task: Task) => {
    try {
      await fetchJSON(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify(task),
      });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await fetchJSON(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter((t) => t.id !== id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold mb-4">Tasks</h3>
      <div className="flex space-x-2 mb-4">
        <input
          className="border p-2 flex-1"
          placeholder="vpn"
          value={newTask.vpn_type}
          onChange={(e) => setNewTask({ ...newTask, vpn_type: e.target.value })}
        />
        <input
          className="border p-2 flex-1"
          placeholder="server"
          value={newTask.server}
          onChange={(e) => setNewTask({ ...newTask, server: e.target.value })}
        />
        <Button onClick={addTask}>Add</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="px-2">ID</th>
            <th className="px-2">VPN</th>
            <th className="px-2">Server</th>
            <th className="px-2">Status</th>
            <th className="px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t">
              <td className="px-2">{task.id}</td>
              <td className="px-2">
                <input
                  className="border p-1"
                  value={task.vpn_type || ''}
                  onChange={(e) =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === task.id ? { ...t, vpn_type: e.target.value } : t
                      )
                    )
                  }
                />
              </td>
              <td className="px-2">
                <input
                  className="border p-1"
                  value={task.server || ''}
                  onChange={(e) =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === task.id ? { ...t, server: e.target.value } : t
                      )
                    )
                  }
                />
              </td>
              <td className="px-2">
                <input
                  className="border p-1"
                  value={task.status || ''}
                  onChange={(e) =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === task.id ? { ...t, status: e.target.value } : t
                      )
                    )
                  }
                />
              </td>
              <td className="px-2 space-x-2">
                <Button size="sm" variant="primary" onClick={() => updateTask(task)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteTask(task.id!)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default TaskManager;
