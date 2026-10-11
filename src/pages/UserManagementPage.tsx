import { useState, useEffect } from 'react';
import { useHR } from '@/context/HRContext';
import { AppUser, ALL_PERMISSIONS, PermissionKey, PermissionDefinition } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck, UserPlus, KeyRound, Trash2, Edit3,
  Search, CheckCircle2, AlertTriangle, Eye, EyeOff,
  CheckSquare, Square, Layers, Shield
} from 'lucide-react';

const COMMON_ROLE_SUGGESTIONS = [
  'Admin',
  'HR',
  'Front Office',
  'Billing / Accounts',
  'Operations Manager',
  'Store Incharge'
];

export default function UserManagementPage() {
  const {
    session,
    isAdmin,
    getUsers,
    createUser,
    updateUserRoleAndPermissions,
    updateUserPassword,
    deleteUser,
  } = useHR();
  const { toast } = useToast();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRoleName, setCreateRoleName] = useState('Front Office');
  const [createPermissions, setCreatePermissions] = useState<string[]>(['quotations', 'customers', 'reports']);
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  // Edit Access Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState<AppUser | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editBusy, setEditBusy] = useState(false);

  // Reset Password Modal state
  const [resetOpen, setResetOpen] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // Delete Modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getUsers();
      setUsers(list);
    } catch {
      toast({ title: 'Error', description: 'Could not fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getUsers]);

  // Permission toggle helpers
  const togglePerm = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    key: PermissionKey
  ) => {
    if (key === 'all') {
      if (currentList.includes('all')) {
        setList([]);
      } else {
        setList(['all', ...ALL_PERMISSIONS.map(p => p.key)]);
      }
      return;
    }

    if (currentList.includes(key)) {
      setList(currentList.filter(k => k !== key && k !== 'all'));
    } else {
      const updated = [...currentList.filter(k => k !== 'all'), key];
      // If all items are selected, add 'all'
      if (ALL_PERMISSIONS.every(p => p.key === key || updated.includes(p.key))) {
        setList(['all', ...updated]);
      } else {
        setList(updated);
      }
    }
  };

  const applyPreset = (
    setRole: (r: string) => void,
    setPerms: (p: string[]) => void,
    presetType: 'admin' | 'hr' | 'front_office' | 'billing' | 'clear'
  ) => {
    if (presetType === 'admin') {
      setRole('Admin');
      setPerms(['all', ...ALL_PERMISSIONS.map(p => p.key)]);
    } else if (presetType === 'hr') {
      setRole('HR');
      setPerms([
        'dashboard', 'employees', 'payroll', 'advances', 'payslip',
        'documentation', 'hr_settings', 'reports', 'quotations', 'customers', 'company_settings'
      ]);
    } else if (presetType === 'front_office') {
      setRole('Front Office');
      setPerms(['quotations', 'customers', 'reports']);
    } else if (presetType === 'billing') {
      setRole('Billing / Accounts');
      setPerms(['payroll', 'advances', 'payslip', 'quotations', 'customers']);
    } else {
      setPerms([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim()) {
      toast({ title: 'Username required', variant: 'destructive' });
      return;
    }
    if (createPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (createPermissions.length === 0) {
      toast({ title: 'No access selected', description: 'Please select at least one accessible section', variant: 'destructive' });
      return;
    }

    setCreateBusy(true);
    try {
      const res = await createUser(
        createUsername.trim(),
        createPassword,
        createRoleName.trim() || 'User',
        createPermissions
      );
      if (res.ok) {
        toast({ title: 'User Created', description: `User "${createUsername}" created with custom access` });
        setCreateOpen(false);
        setCreateUsername('');
        setCreatePassword('');
        setCreateRoleName('Front Office');
        setCreatePermissions(['quotations', 'customers', 'reports']);
        await loadData();
      } else {
        toast({ title: 'Creation failed', description: res.error, variant: 'destructive' });
      }
    } finally {
      setCreateBusy(false);
    }
  };

  const openEditModal = (u: AppUser) => {
    setEditTargetUser(u);
    setEditRoleName(u.role);
    setEditPermissions(u.permissions || []);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;
    if (editPermissions.length === 0) {
      toast({ title: 'No access selected', description: 'Please select at least one accessible section', variant: 'destructive' });
      return;
    }

    setEditBusy(true);
    try {
      const res = await updateUserRoleAndPermissions(
        editTargetUser.username,
        editRoleName.trim() || 'User',
        editPermissions
      );
      if (res.ok) {
        toast({ title: 'Access Updated', description: `Updated permissions for @${editTargetUser.username}` });
        setEditOpen(false);
        setEditTargetUser(null);
        await loadData();
      } else {
        toast({ title: 'Update failed', description: res.error, variant: 'destructive' });
      }
    } finally {
      setEditBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetUser) return;
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setResetBusy(true);
    try {
      const res = await updateUserPassword(targetResetUser, newPassword);
      if (res.ok) {
        toast({ title: 'Password Reset', description: `Password for @${targetResetUser} updated successfully` });
        setResetOpen(false);
        setNewPassword('');
        setTargetResetUser(null);
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } finally {
      setResetBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setDeleteBusy(true);
    try {
      const res = await deleteUser(userToDelete);
      if (res.ok) {
        toast({ title: 'User Deleted', description: `User @${userToDelete} removed` });
        setDeleteOpen(false);
        setUserToDelete(null);
        await loadData();
      } else {
        toast({ title: 'Delete failed', description: res.error, variant: 'destructive' });
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Only administrators can access User & Access Management.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  // Group permissions by category for the modal checkboxes
  const categories: Array<PermissionDefinition['category']> = [
    'HR Management',
    'Quotation & Sales',
    'Reports',
    'System & Settings',
  ];

  const renderPermissionCheckboxes = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const isAllChecked = currentList.includes('all') || ALL_PERMISSIONS.every(p => currentList.includes(p.key));

    return (
      <div className="space-y-4">
        {/* Master Select All Checkbox */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center space-x-2.5">
            <Checkbox
              id="perm-all"
              checked={isAllChecked}
              onCheckedChange={() => togglePerm(currentList, setList, 'all')}
            />
            <label htmlFor="perm-all" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" /> Grant Full System Access (All Sections)
            </label>
          </div>
          <span className="text-[11px] text-primary font-semibold">
            {currentList.includes('all') ? ALL_PERMISSIONS.length : currentList.length} of {ALL_PERMISSIONS.length} selected
          </span>
        </div>

        {/* Categorized Checkbox Grid */}
        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {categories.map(cat => {
            const perms = ALL_PERMISSIONS.filter(p => p.category === cat);
            return (
              <div key={cat} className="border border-border rounded-xl p-3 bg-card/60">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allCatKeys = perms.map(p => p.key);
                      const allCatSelected = allCatKeys.every(k => currentList.includes(k));
                      if (allCatSelected) {
                        setList(currentList.filter(k => !allCatKeys.includes(k as PermissionKey) && k !== 'all'));
                      } else {
                        const merged = Array.from(new Set([...currentList, ...allCatKeys]));
                        setList(merged);
                      }
                    }}
                    className="text-[11px] text-primary font-medium hover:underline"
                  >
                    Toggle All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map(p => {
                    const isChecked = currentList.includes('all') || currentList.includes(p.key);
                    return (
                      <div
                        key={p.key}
                        onClick={() => togglePerm(currentList, setList, p.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-primary/5 border-primary/40 text-foreground'
                            : 'bg-muted/20 border-border/40 hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <Checkbox
                          id={`perm-${p.key}`}
                          checked={isChecked}
                          onCheckedChange={() => togglePerm(currentList, setList, p.key)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`perm-${p.key}`} className="text-xs font-semibold block cursor-pointer text-foreground">
                            {p.label}
                          </label>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                            {p.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center border border-purple-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">User & Access Management</h1>
            <p className="text-sm text-muted-foreground">
              Define custom access roles and check off allowed sections for each user
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4" /> Add New User
        </Button>
      </div>

      {/* Search and Summary */}
      <div className="bg-card border border-border rounded-xl p-4 card-shadow flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or role name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          Total Portal Users: <span className="text-foreground font-bold">{users.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Access / Role Name</th>
                <th className="px-6 py-3.5">Allowed Sections</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    Loading users…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isCurrent = session?.user?.email === u.username;
                  const hasAll = u.permissions.includes('all');
                  const count = hasAll ? ALL_PERMISSIONS.length : u.permissions.length;

                  return (
                    <tr key={u.username} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{u.username}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-muted/60 text-foreground border-border">
                          {u.role || 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {hasAll ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 font-semibold text-xs">
                            Full Access (All Sections)
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">
                              {count} section{count !== 1 ? 's' : ''} permitted:
                            </span>
                            <div className="flex gap-1 flex-wrap max-w-sm">
                              {u.permissions.slice(0, 3).map(pKey => {
                                const def = ALL_PERMISSIONS.find(p => p.key === pKey);
                                return (
                                  <span key={pKey} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                                    {def?.label || pKey}
                                  </span>
                                );
                              })}
                              {u.permissions.length > 3 && (
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  +{u.permissions.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Access
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => {
                              setTargetResetUser(u.username);
                              setNewPassword('');
                              setResetOpen(true);
                            }}
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Password
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isCurrent}
                            title={isCurrent ? "You cannot delete your own account" : "Delete user"}
                            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                            onClick={() => {
                              setUserToDelete(u.username);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User & Configure Access</DialogTitle>
            <DialogDescription>
              Assign a custom role name and check off the sections this user can access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">
                  Username *
                </label>
                <Input
                  placeholder="e.g. frontdesk, manager"
                  value={createUsername}
                  onChange={e => setCreateUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">
                  Password * (min. 6 chars)
                </label>
                <div className="relative">
                  <Input
                    type={showCreatePass ? 'text' : 'password'}
                    placeholder="Enter login password"
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Access / Role Title *
                </label>
                <span className="text-[11px] text-muted-foreground">Type any custom title or choose a preset</span>
              </div>
              <Input
                placeholder="e.g. HR, Front Office, Accounts, Plant Manager"
                value={createRoleName}
                onChange={e => setCreateRoleName(e.target.value)}
                required
              />
              {/* Quick suggestions pills */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[11px] text-muted-foreground font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset(setCreateRoleName, setCreatePermissions, 'admin')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold"
                >
                  Full Admin (All)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setCreateRoleName, setCreatePermissions, 'hr')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold"
                >
                  HR Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setCreateRoleName, setCreatePermissions, 'front_office')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold"
                >
                  Front Office Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setCreateRoleName, setCreatePermissions, 'billing')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold"
                >
                  Billing Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setCreateRoleName, setCreatePermissions, 'clear')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Checkboxes Section */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                Accessible Sections (Check to Allow Access)
              </label>
              {renderPermissionCheckboxes(createPermissions, setCreatePermissions)}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createBusy}>
                {createBusy ? 'Creating…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Access Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Access for @{editTargetUser?.username}</DialogTitle>
            <DialogDescription>
              Adjust this user's custom role title and section access checkboxes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Access / Role Title *
                </label>
                <span className="text-[11px] text-muted-foreground">Type any custom title</span>
              </div>
              <Input
                placeholder="e.g. HR, Front Office, Accounts, Plant Manager"
                value={editRoleName}
                onChange={e => setEditRoleName(e.target.value)}
                required
              />
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[11px] text-muted-foreground font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset(setEditRoleName, setEditPermissions, 'admin')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold"
                >
                  Full Admin (All)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setEditRoleName, setEditPermissions, 'hr')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold"
                >
                  HR Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setEditRoleName, setEditPermissions, 'front_office')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold"
                >
                  Front Office Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setEditRoleName, setEditPermissions, 'billing')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold"
                >
                  Billing Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(setEditRoleName, setEditPermissions, 'clear')}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                Accessible Sections (Check to Allow Access)
              </label>
              {renderPermissionCheckboxes(editPermissions, setEditPermissions)}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editBusy}>
                {editBusy ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for user <strong>@{targetResetUser}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">New Password (min. 6 characters)</label>
              <div className="relative">
                <Input
                  type={showResetPass ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPass(!showResetPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={resetBusy}>
                {resetBusy ? 'Saving…' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete user <strong>@{userToDelete}</strong>? They will immediately lose access to the portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
