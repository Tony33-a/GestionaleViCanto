import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import usersService from '../../services/usersService'
import './Waiters.css'

function MonitorWaiters() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({ username: '', pin: '', role: 'waiter' })

  // Fetch utenti
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll
  })

  // Mutation crea utente
  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddModal(false)
      setFormData({ username: '', pin: '', role: 'waiter' })
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Errore nella creazione')
    }
  })

  // Mutation aggiorna utente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      setFormData({ username: '', pin: '', role: 'waiter' })
    }
  })

  // Mutation disattiva utente
  const deactivateMutation = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingUser) {
      const updateData = { username: formData.username, role: formData.role }
      if (formData.pin) updateData.pin = formData.pin
      updateMutation.mutate({ id: editingUser.id, data: updateData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({ username: user.username, pin: '', role: user.role })
    setShowAddModal(true)
  }

  const handleDelete = (user) => {
    if (confirm(`Disattivare ${user.username}?`)) {
      deactivateMutation.mutate(user.id)
    }
  }

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="role-badge admin">Admin</span>
    return <span className="role-badge waiter">Cameriere</span>
  }

  if (isLoading) {
    return (
      <div className="waiters-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="waiters-page">
        <div className="error-state">
          <p>Errore nel caricamento degli utenti</p>
        </div>
      </div>
    )
  }

  return (
    <div className="waiters-page">
      <div className="waiters-header">
        <h2>Gestione Camerieri</h2>
        <button className="add-user-btn" onClick={() => {
          setEditingUser(null)
          setFormData({ username: '', pin: '', role: 'waiter' })
          setShowAddModal(true)
        }}>
          + Nuovo Utente
        </button>
      </div>

      <div className="users-list">
        {users.map((user) => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <span className="user-name">{user.username}</span>
              {getRoleBadge(user.role)}
            </div>
            <div className="user-actions">
              <button className="edit-btn" onClick={() => handleEdit(user)}>
                Modifica
              </button>
              <button className="delete-btn" onClick={() => handleDelete(user)}>
                Disattiva
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Aggiungi/Modifica */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingUser ? 'Modifica Utente' : 'Nuovo Utente'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>PIN (4 cifre){editingUser && ' - lascia vuoto per non cambiare'}</label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Ruolo</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="waiter">Cameriere</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="save-btn">
                  {editingUser ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonitorWaiters
