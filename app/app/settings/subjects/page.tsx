'use client'

import { useState } from 'react'
import { Plus, Trash2, Palette } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TaskGroup } from '@/types'

const PALETTE = [
  '#4A90E2',
  '#8B5CF6',
  '#10B981',
  '#F97316',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#06B6D4',
  '#EF4444',
  '#84CC16',
]

export default function SubjectsPage() {
  const { groups, addGroup, updateGroup, deleteGroup } = useStore()

  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])

  function resetForm() {
    setName('')
    setColor(PALETTE[0])
    setAdding(false)
    setEditId(null)
  }

  function openEdit(g: TaskGroup) {
    setEditId(g.id)
    setName(g.name)
    setColor(g.colorHex)
    setAdding(true)
  }

  function handleSave() {
    if (!name.trim()) return
    const data = { name: name.trim(), colorHex: color }
    if (editId) {
      const existing = groups.find((g) => g.id === editId)
      if (existing) updateGroup({ ...existing, ...data })
    } else {
      addGroup(data)
    }
    resetForm()
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Organize tasks by subject with color coding.
          </p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Subject
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {adding && (
        <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-3">
          <p className="text-sm font-medium">{editId ? 'Edit Subject' : 'New Subject'}</p>

          <div className="space-y-1.5">
            <Label htmlFor="subj-name">Name</Label>
            <Input
              id="subj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {/* Custom color input */}
              <label className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-foreground transition-colors">
                <Palette className="w-3 h-3 text-muted-foreground" />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs mono-nums text-muted-foreground">{color}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1" disabled={!name.trim()}>
              {editId ? 'Save' : 'Add Subject'}
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Group list */}
      {groups.length === 0 && !adding ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Palette className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No subjects yet</p>
          <p className="text-xs text-muted-foreground">
            Add subjects to organize and color-code your tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 group"
            >
              <div
                className="w-5 h-5 rounded-full shrink-0"
                style={{ backgroundColor: g.colorHex }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{g.name}</span>
                <span className="text-xs mono-nums text-muted-foreground ml-2">{g.colorHex}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(g)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteGroup(g.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
