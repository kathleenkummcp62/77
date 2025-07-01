import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { DataTable } from "../ui/DataTable";
import { VendorURL, CredentialPair, ProxySetting, Task } from "../../types";
import toast from "react-hot-toast";
import { Link, Plus, Trash2, RefreshCw, Download, Edit, Save } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { 
  fetchCredentials, 
  addCredential, 
  updateCredential, 
  deleteCredential, 
  bulkDeleteCredentials,
  selectCredential,
  deselectCredential,
  selectAllCredentials,
  clearCredentialSelection
} from "../../store/slices/dataStoreSlice";

type Selectable<T> = T & { selected?: boolean }

export function DataStore() {
  const dispatch = useAppDispatch();
  const { 
    credentials, 
    selectedCredentials, 
    loading, 
    pagination 
  } = useAppSelector(state => state.dataStore);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCredential, setEditingCredential] = useState<CredentialPair | null>(null);
  const [newCred, setNewCred] = useState({ login: "", password: "", ip: "" });
  
  useEffect(() => {
    dispatch(fetchCredentials({ page: 1, pageSize: 10 }));
  }, [dispatch]);

  const handleSearch = () => {
    dispatch(fetchCredentials({ 
      page: 1, 
      pageSize: pagination.pageSize, 
      search: searchTerm 
    }));
  };

  const handlePageChange = (page: number) => {
    dispatch(fetchCredentials({ 
      page, 
      pageSize: pagination.pageSize, 
      search: searchTerm 
    }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    dispatch(fetchCredentials({ 
      page: 1, 
      pageSize, 
      search: searchTerm 
    }));
  };

  const handleRefresh = () => {
    dispatch(fetchCredentials({ 
      page: pagination.currentPage, 
      pageSize: pagination.pageSize, 
      search: searchTerm 
    }));
  };

  const handleExport = () => {
    // Export credentials to CSV
    const csv = [
      ['ID', 'IP', 'Username', 'Password'].join(','),
      ...credentials.map(cred => [
        cred.id,
        cred.ip,
        cred.username,
        cred.password
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Credentials exported successfully');
  };

  const handleAddCredential = async () => {
    if (!newCred.ip || !newCred.login || !newCred.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await dispatch(addCredential({
        ip: newCred.ip,
        username: newCred.login,
        password: newCred.password
      })).unwrap();
      
      setNewCred({ login: "", password: "", ip: "" });
      toast.success('Credential added successfully');
    } catch (error: any) {
      toast.error(`Failed to add credential: ${error.message}`);
    }
  };

  const handleUpdateCredential = async () => {
    if (!editingCredential) return;
    
    try {
      await dispatch(updateCredential(editingCredential)).unwrap();
      setEditingCredential(null);
      toast.success('Credential updated successfully');
    } catch (error: any) {
      toast.error(`Failed to update credential: ${error.message}`);
    }
  };

  const handleDeleteCredential = async (id: number) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    
    try {
      await dispatch(deleteCredential(id)).unwrap();
      toast.success('Credential deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete credential: ${error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCredentials.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCredentials.length} credentials?`)) return;
    
    try {
      await dispatch(bulkDeleteCredentials(selectedCredentials)).unwrap();
      toast.success(`${selectedCredentials.length} credentials deleted successfully`);
    } catch (error: any) {
      toast.error(`Failed to delete credentials: ${error.message}`);
    }
  };

  const credentialColumns = [
    {
      key: 'id',
      header: 'ID',
      sortable: true
    },
    {
      key: 'ip',
      header: 'IP',
      sortable: true,
      render: (row: CredentialPair) => {
        if (editingCredential && editingCredential.id === row.id) {
          return (
            <input
              type="text"
              value={editingCredential.ip}
              onChange={(e) => setEditingCredential({ ...editingCredential, ip: e.target.value })}
              className="w-full p-1 border border-gray-300 rounded"
            />
          );
        }
        return row.ip;
      }
    },
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      render: (row: CredentialPair) => {
        if (editingCredential && editingCredential.id === row.id) {
          return (
            <input
              type="text"
              value={editingCredential.username}
              onChange={(e) => setEditingCredential({ ...editingCredential, username: e.target.value })}
              className="w-full p-1 border border-gray-300 rounded"
            />
          );
        }
        return row.username;
      }
    },
    {
      key: 'password',
      header: 'Password',
      sortable: true,
      render: (row: CredentialPair) => {
        if (editingCredential && editingCredential.id === row.id) {
          return (
            <input
              type="text"
              value={editingCredential.password}
              onChange={(e) => setEditingCredential({ ...editingCredential, password: e.target.value })}
              className="w-full p-1 border border-gray-300 rounded"
            />
          );
        }
        return row.password;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: CredentialPair) => {
        if (editingCredential && editingCredential.id === row.id) {
          return (
            <div className="flex space-x-2">
              <Button size="sm" variant="primary" onClick={handleUpdateCredential}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingCredential(null)}>
                Cancel
              </Button>
            </div>
          );
        }
        
        return (
          <div className="flex space-x-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingCredential(row)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDeleteCredential(row.id)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Store</h1>
          <p className="text-gray-600 mt-1">Manage credentials, proxies, and tasks</p>
        </div>
      </div>

      {/* Add Credential Form */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Plus className="h-5 w-5 mr-2 text-primary-600" />
          Add New Credential
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={newCred.ip}
              onChange={(e) => setNewCred(prev => ({ ...prev, ip: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="192.168.1.1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={newCred.login}
              onChange={(e) => setNewCred(prev => ({ ...prev, login: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="admin"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="text"
              value={newCred.password}
              onChange={(e) => setNewCred(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="password"
            />
          </div>
        </div>
        
        <Button 
          variant="primary" 
          className="mt-4"
          onClick={handleAddCredential}
          loading={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Credential
        </Button>
      </Card>

      {/* Credentials Table */}
      <DataTable
        title="Credentials"
        columns={credentialColumns}
        data={credentials}
        keyField="id"
        loading={loading}
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          totalItems: pagination.totalItems,
          pageSize: pagination.pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          onSearch: handleSearch,
        }}
        onRefresh={handleRefresh}
        onExport={handleExport}
        selectable
        selectedRows={selectedCredentials.map(id => credentials.find(c => c.id === id)!).filter(Boolean)}
        onSelectRow={(row) => {
          if (selectedCredentials.includes(row.id)) {
            dispatch(deselectCredential(row.id));
          } else {
            dispatch(selectCredential(row.id));
          }
        }}
        onSelectAll={() => {
          if (selectedCredentials.length === credentials.length) {
            dispatch(clearCredentialSelection());
          } else {
            dispatch(selectAllCredentials());
          }
        }}
        onClearSelection={() => dispatch(clearCredentialSelection())}
        bulkActions={
          <Button size="sm" variant="error" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        }
        emptyState={
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No credentials</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a new credential.
            </p>
          </div>
        }
      />
    </div>
  );
}