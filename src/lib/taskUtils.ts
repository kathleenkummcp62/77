import { Task } from '../store/slices/tasksSlice';
import toast from 'react-hot-toast';

/**
 * Filter tasks based on search and filter criteria
 */
export function filterTasks(
  tasks: Task[],
  filters: {
    search?: string;
    status?: string;
    priority?: string;
    vpnType?: string;
  }
): Task[] {
  return tasks.filter(task => {
    // Search filter
    if (filters.search && !taskMatchesSearch(task, filters.search)) {
      return false;
    }
    
    // Status filter
    if (filters.status && task.status !== filters.status) {
      return false;
    }
    
    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    
    // VPN type filter
    if (filters.vpnType && task.vpnType !== filters.vpnType) {
      return false;
    }
    
    return true;
  });
}

/**
 * Check if task matches search term
 */
function taskMatchesSearch(task: Task, search: string): boolean {
  const searchLower = search.toLowerCase();
  
  return (
    task.name.toLowerCase().includes(searchLower) ||
    task.description.toLowerCase().includes(searchLower) ||
    task.vpnType.toLowerCase().includes(searchLower) ||
    task.targets.some(target => target.toLowerCase().includes(searchLower)) ||
    task.workers.some(worker => worker.toLowerCase().includes(searchLower))
  );
}

/**
 * Sort tasks by specified field
 */
export function sortTasks(
  tasks: Task[],
  sortBy: keyof Task | 'deadline',
  sortDirection: 'asc' | 'desc' = 'asc'
): Task[] {
  return [...tasks].sort((a, b) => {
    let valueA: any;
    let valueB: any;
    
    // Handle special cases
    if (sortBy === 'deadline') {
      valueA = new Date(a.deadline).getTime();
      valueB = new Date(b.deadline).getTime();
    } else if (sortBy === 'createdAt') {
      valueA = new Date(a.createdAt).getTime();
      valueB = new Date(b.createdAt).getTime();
    } else if (sortBy === 'targets' || sortBy === 'workers' || sortBy === 'attachments') {
      valueA = a[sortBy].length;
      valueB = b[sortBy].length;
    } else {
      valueA = a[sortBy];
      valueB = b[sortBy];
    }
    
    // Compare values
    if (valueA < valueB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Group tasks by specified field
 */
export function groupTasks(
  tasks: Task[],
  groupBy: 'status' | 'priority' | 'vpnType'
): Record<string, Task[]> {
  return tasks.reduce((groups, task) => {
    const key = task[groupBy];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
    return groups;
  }, {} as Record<string, Task[]>);
}

/**
 * Calculate task statistics
 */
export function calculateTaskStats(tasks: Task[]): {
  total: number;
  pending: number;
  running: number;
  completed: number;
  error: number;
  highPriority: number;
  overdue: number;
} {
  const now = new Date();
  
  return {
    total: tasks.length,
    pending: tasks.filter(task => task.status === 'pending').length,
    running: tasks.filter(task => task.status === 'running').length,
    completed: tasks.filter(task => task.status === 'completed').length,
    error: tasks.filter(task => task.status === 'error').length,
    highPriority: tasks.filter(task => task.priority === 'high').length,
    overdue: tasks.filter(task => new Date(task.deadline) < now).length
  };
}

/**
 * Validate task data
 */
export function validateTask(task: Partial<Task>): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  if (!task.name?.trim()) {
    errors.name = 'Task name is required';
  }
  
  if (!task.targets || task.targets.length === 0) {
    errors.targets = 'At least one target is required';
  }
  
  if (!task.workers || task.workers.length === 0) {
    errors.workers = 'At least one worker is required';
  }
  
  if (!task.deadline) {
    errors.deadline = 'Deadline is required';
  } else if (new Date(task.deadline) < new Date()) {
    errors.deadline = 'Deadline cannot be in the past';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Run a task on worker servers
 */
export async function runTaskOnWorkers(task: Task): Promise<boolean> {
  try {
    // In a real implementation, this would make API calls to worker servers
    // For now, we'll just simulate success
    console.log(`Running task ${task.id} on workers:`, task.workers);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Task "${task.name}" started on ${task.workers.length} workers`);
    return true;
  } catch (error) {
    console.error('Error running task:', error);
    toast.error(`Failed to run task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Get task execution status from workers
 */
export async function getTaskStatus(taskId: string): Promise<{
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  results?: {
    valid: number;
    invalid: number;
    errors: number;
  };
}> {
  try {
    // In a real implementation, this would make API calls to worker servers
    // For now, we'll just simulate a response
    console.log(`Getting status for task ${taskId}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock status
    return {
      status: Math.random() > 0.2 ? 'running' : 'error',
      progress: Math.floor(Math.random() * 100),
      results: {
        valid: Math.floor(Math.random() * 100),
        invalid: Math.floor(Math.random() * 1000),
        errors: Math.floor(Math.random() * 50)
      }
    };
  } catch (error) {
    console.error('Error getting task status:', error);
    return {
      status: 'error',
      progress: 0
    };
  }
}