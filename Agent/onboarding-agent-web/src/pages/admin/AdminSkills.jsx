import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

export default function AdminSkills() {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: async () => {
      const res = await api.get('/admin/skills')
      return res.data.data.skills
    },
  })

  const resetForm = () => {
    setLabel('')
    setCode('')
    setSortOrder('0')
    setError('')
  }

  const createSkill = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/skills', {
        label,
        code: code.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
      })
      resetForm()
      qc.invalidateQueries({ queryKey: ['admin-skills'] })
      qc.invalidateQueries({ queryKey: ['skills'] })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add skill')
    }
  }

  const toggleActive = async (skill) => {
    await api.patch(`/admin/skills/${skill.id}`, { isActive: !skill.isActive })
    qc.invalidateQueries({ queryKey: ['admin-skills'] })
    qc.invalidateQueries({ queryKey: ['skills'] })
  }

  const removeSkill = async (skill) => {
    if (!window.confirm(`Remove skill "${skill.label}"?`)) return
    await api.delete(`/admin/skills/${skill.id}`)
    qc.invalidateQueries({ queryKey: ['admin-skills'] })
    qc.invalidateQueries({ queryKey: ['skills'] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Skills</h2>
        <p className="mt-1 text-sm text-subtext">
          Manage service skills shown on servant onboarding and house owner browse.
        </p>
      </div>

      <form
        onSubmit={createSkill}
        className="space-y-4 rounded-xl bg-surface p-6 shadow-sm"
      >
        <h3 className="font-semibold">Add skill</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Elderly care"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Code (optional)</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Auto from label"
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Sort order</span>
            <input
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit">Add skill</Button>
      </form>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4">Label</th>
                <th className="p-4">Code</th>
                <th className="p-4">Order</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((skill) => (
                <tr key={skill.id} className="border-b">
                  <td className="p-4 font-medium">{skill.label}</td>
                  <td className="p-4">{skill.code}</td>
                  <td className="p-4">{skill.sortOrder}</td>
                  <td className="p-4">
                    <Badge status={skill.isActive ? 'VERIFIED' : 'REJECTED'} />
                    <span className="ml-2 text-subtext">
                      {skill.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 space-x-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(skill)}
                      className="text-primary underline"
                    >
                      {skill.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-error underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
