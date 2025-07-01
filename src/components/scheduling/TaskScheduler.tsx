import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  Edit,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { format, addDays, isAfter, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  fetchScheduledTasks,
  createScheduledTask,
  updateScheduledTaskApi,
  deleteScheduledTask,
  toggleTaskLocal,
} from "../../store/slices/schedulerSlice";

interface ScheduleFormProps {
  onSubmit: (task: any) => void;
  onCancel: () => void;
  initialValues?: any;
  isEdit?: boolean;
}

function ScheduleForm({
  onSubmit,
  onCancel,
  initialValues,
  isEdit = false,
}: ScheduleFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    taskType: "scan",
    vpnType: "fortinet",
    scheduledDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    scheduledTime: "12:00",
    repeat: "once",
    servers: [] as string[],
    ...initialValues,
  });

  const { servers } = useAppSelector((state) => state.servers);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServerToggle = (ip: string) => {
    setFormData((prev) => {
      const servers = [...prev.servers];
      if (servers.includes(ip)) {
        return { ...prev, servers: servers.filter((s) => s !== ip) };
      } else {
        return { ...prev, servers: [...servers, ip] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      toast.error("Schedule date and time are required");
      return;
    }

    if (formData.servers.length === 0) {
      toast.error("Select at least one server");
      return;
    }

    // Create scheduled date
    const scheduledDateTime = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}`,
    );

    // Check if date is in the future
    if (!isAfter(scheduledDateTime, new Date())) {
      toast.error("Schedule time must be in the future");
      return;
    }

    onSubmit({
      ...formData,
      scheduledDateTime: scheduledDateTime.toISOString(),
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEdit ? "Edit Scheduled Task" : "Schedule New Task"}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Task name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Task description"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Type
            </label>
            <select
              name="taskType"
              value={formData.taskType}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="scan">VPN Scan</option>
              <option value="collect">Collect Results</option>
              <option value="deploy">Deploy Scripts</option>
              <option value="report">Generate Report</option>
            </select>
          </div>

          {formData.taskType === "scan" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VPN Type
              </label>
              <select
                name="vpnType"
                value={formData.vpnType}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="fortinet">Fortinet</option>
                <option value="globalprotect">GlobalProtect</option>
                <option value="sonicwall">SonicWall</option>
                <option value="sophos">Sophos</option>
                <option value="watchguard">WatchGuard</option>
                <option value="cisco">Cisco</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repeat
          </label>
          <select
            name="repeat"
            value={formData.repeat}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Servers
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {servers.length > 0 ? (
              servers.map((server) => (
                <div key={server.ip} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`server-${server.ip}`}
                    checked={formData.servers.includes(server.ip)}
                    onChange={() => handleServerToggle(server.ip)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor={`server-${server.ip}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {server.ip}{" "}
                    {server.status === "online" && (
                      <span className="text-success-600">(Online)</span>
                    )}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-2">No servers available</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {isEdit ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Task
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Task
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function TaskScheduler() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const dispatch = useAppDispatch();
  const { scheduledTasks } = useAppSelector((state) => state.scheduler);

  useEffect(() => {
    dispatch(fetchScheduledTasks());
  }, [dispatch]);

  // Check for tasks that need to be executed
  useEffect(() => {
    const checkScheduledTasks = () => {
      const now = new Date();

      scheduledTasks.forEach((task) => {
        if (task.active && !task.executed) {
          const scheduledTime = new Date(task.scheduledDateTime);

          if (isAfter(now, scheduledTime)) {
            // Execute task
            executeTask(task);

            // Handle repeating tasks
            if (task.repeat !== "once") {
              // Calculate next execution time based on repeat pattern
              let nextDate = new Date(task.scheduledDateTime);

              switch (task.repeat) {
                case "daily":
                  nextDate = addDays(nextDate, 1);
                  break;
                case "weekly":
                  nextDate = addDays(nextDate, 7);
                  break;
                case "monthly":
                  nextDate = new Date(
                    nextDate.setMonth(nextDate.getMonth() + 1),
                  );
                  break;
              }

              // Update task with new scheduled time
              dispatch(
                updateScheduledTaskApi({
                  ...task,
                  scheduledDateTime: nextDate.toISOString(),
                  executed: false,
                }),
              );
            } else {
              // Mark one-time task as executed
              dispatch(
                updateScheduledTaskApi({
                  ...task,
                  executed: true,
                }),
              );
            }
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkScheduledTasks, 60000);

    // Initial check
    checkScheduledTasks();

    return () => clearInterval(interval);
  }, [dispatch, scheduledTasks]);

  const executeTask = (task: any) => {
    // In a real implementation, this would trigger the actual task execution
    // For now, we'll just show a toast notification
    toast.success(`Executing task: ${task.title}`);

    // Simulate task execution based on type
    switch (task.taskType) {
      case "scan":
        toast(
          `Starting ${task.vpnType} scan on ${task.servers.length} servers`,
        );
        break;
      case "collect":
        toast("Collecting results from servers");
        break;
      case "deploy":
        toast(`Deploying scripts to ${task.servers.length} servers`);
        break;
      case "report":
        toast("Generating report");
        break;
    }
  };

  const handleAddTask = (task: any) => {
    dispatch(
      createScheduledTask({
        ...task,
        active: true,
        executed: false,
      } as any),
    );
    setShowForm(false);
    toast.success("Task scheduled successfully");
  };

  const handleUpdateTask = (task: any) => {
    dispatch(updateScheduledTaskApi(task));
    setEditingTask(null);
    toast.success("Task updated successfully");
  };

  const handleRemoveTask = (id: string) => {
    if (confirm("Are you sure you want to remove this scheduled task?")) {
      dispatch(deleteScheduledTask(Number(id)));
      toast.success("Task removed");
    }
  };

  const handleToggleActive = (id: string) => {
    dispatch(toggleTaskLocal(Number(id)));
    const t = scheduledTasks.find((t) => t.id === Number(id));
    if (t) {
      dispatch(updateScheduledTaskApi({ ...t }));
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "scan":
        return Play;
      case "collect":
        return Download;
      case "deploy":
        return Upload;
      case "report":
        return FileText;
      default:
        return Calendar;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Scheduler</h2>
          <p className="text-gray-600 mt-1">
            Schedule and manage automated tasks
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          disabled={showForm || editingTask !== null}
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Task
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <ScheduleForm
          onSubmit={handleAddTask}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingTask && (
        <ScheduleForm
          onSubmit={handleUpdateTask}
          onCancel={() => setEditingTask(null)}
          initialValues={editingTask}
          isEdit
        />
      )}

      {/* No tasks message */}
      {scheduledTasks.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No scheduled tasks
          </h3>
          <p className="text-gray-600 mb-6">
            Schedule tasks to automate scanning, result collection, and
            reporting
          </p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Your First Task
          </Button>
        </Card>
      )}

      {/* Task list */}
      {scheduledTasks.length > 0 && (
        <div className="space-y-4">
          {scheduledTasks.map((task) => {
            const TaskTypeIcon = getTaskTypeIcon(task.taskType);
            const scheduledDate = new Date(task.scheduledDateTime);
            const isPast = isAfter(new Date(), scheduledDate);

            return (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-lg ${task.active ? "bg-primary-100" : "bg-gray-100"}`}
                    >
                      <TaskTypeIcon
                        className={`h-6 w-6 ${task.active ? "text-primary-600" : "text-gray-400"}`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {task.title}
                        </h3>
                        <Badge
                          variant={
                            task.active
                              ? isPast && task.executed
                                ? "success"
                                : "primary"
                              : "gray"
                          }
                        >
                          {task.active
                            ? isPast
                              ? task.executed
                                ? "Executed"
                                : "Pending"
                              : "Scheduled"
                            : "Inactive"}
                        </Badge>
                        {task.repeat !== "once" && (
                          <Badge variant="warning">Repeats {task.repeat}</Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        {task.description}
                      </p>

                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{format(scheduledDate, "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{format(scheduledDate, "h:mm a")}</span>
                        </div>
                        {task.taskType === "scan" && (
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-1" />
                            <span>{task.vpnType}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Server className="h-4 w-4 mr-1" />
                          <span>{task.servers.length} servers</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(task.id)}
                    >
                      {task.active ? (
                        <Pause className="h-4 w-4 mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {task.active ? "Disable" : "Enable"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditTask(task)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {isPast && !task.executed && task.active && (
                  <div className="mt-3 p-2 bg-warning-50 border border-warning-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-warning-600" />
                    <span className="text-sm text-warning-700">
                      This task is scheduled to run soon. Make sure all selected
                      servers are online.
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Help text */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-blue-100 rounded-full">
            <AlertCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-800">About Task Scheduling</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Tasks will execute automatically at the scheduled time</li>
              <li>• Repeating tasks will be rescheduled after execution</li>
              <li>
                • Make sure servers are online when tasks are scheduled to run
              </li>
              <li>
                • The dashboard must be running for scheduled tasks to execute
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
