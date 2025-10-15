/*
Hotel Staff Dashboard (Single-file React component) — Diseño mejorado

Este archivo es la versión modernizada y visualmente mejorada del panel.
Sigue usando TailwindCSS. Reemplaza el anterior `src/HotelDashboard.jsx` por este.

Mejoras añadidas:
- Diseño más elegante: paleta suave, tarjetas con sombras, tipografía, espaciado.
- Avatares/íconos SVG inline para evitar dependencias extra.
- Badges (etiquetas) para estados (Disponible, Ocupada, Reservada, Sucia) con colores y transiciones.
- Barra lateral fija con información rápida y acciones.
- Modal estilizado con overlay y separación clara.
- Accesibilidad básica: botones con aria-labels.
- Mantiene toda la lógica existente (reservas, check-in/out, housekeeping, export CSV, persistencia local).
*/

import React, { useEffect, useMemo, useState } from 'react'

// ---------- Datos de muestra ----------
const sampleRooms = [
  { id: '101', type: 'Single', floor: 1 },
  { id: '102', type: 'Double', floor: 1 },
  { id: '103', type: 'Suite', floor: 1 },
  { id: '201', type: 'Single', floor: 2 },
  { id: '202', type: 'Double', floor: 2 },
  { id: '203', type: 'Suite', floor: 2 },
  { id: '301', type: 'Double', floor: 3 },
  { id: '302', type: 'Single', floor: 3 },
]

const sampleReservations = [
  {
    id: 'r1',
    guest: 'María López',
    roomId: '101',
    checkIn: '2025-10-14',
    checkOut: '2025-10-16',
    status: 'reserved'
  },
  {
    id: 'r2',
    guest: 'John Doe',
    roomId: '102',
    checkIn: '2025-10-13',
    checkOut: '2025-10-15',
    status: 'checked-in'
  }
]

function uid(prefix = ''){
  return prefix + Math.random().toString(36).slice(2,9)
}

// ---------- Helpers (persistencia) ----------
function loadFromStorage(){
  try{
    const raw = localStorage.getItem('hotel_data')
    if(!raw) return { rooms: sampleRooms, reservations: sampleReservations, housekeeping: {} }
    return JSON.parse(raw)
  }catch(e){
    return { rooms: sampleRooms, reservations: sampleReservations, housekeeping: {} }
  }
}
function saveToStorage(state){
  localStorage.setItem('hotel_data', JSON.stringify(state))
}

function formatDate(d){
  if(!d) return ''
  const dt = new Date(d)
  return dt.toISOString().slice(0,10)
}

function dateInRange(dateStr, startStr, endStr){
  const date = new Date(dateStr)
  const start = new Date(startStr)
  const end = new Date(endStr)
  return date >= start && date < end
}

// ---------- UI helpers ----------
function StatusBadge({ status }){
  const map = {
    Available: ['bg-green-100', 'text-green-800'],
    Reserved: ['bg-yellow-100', 'text-yellow-800'],
    Occupied: ['bg-red-100', 'text-red-800'],
    Dirty: ['bg-indigo-100', 'text-indigo-800'],
  }
  const cls = map[status] || ['bg-gray-100', 'text-gray-800']
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[0]} ${cls[1]}`}>{status}</span>
  )
}

function IconExport(){
  return (
    <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M21 21H3"/></svg>
  )
}

// ---------- Main component ----------
export default function HotelDashboard(){
  const persisted = useMemo(() => loadFromStorage(), [])
  const [rooms, setRooms] = useState(persisted.rooms)
  const [reservations, setReservations] = useState(persisted.reservations)
  const [housekeeping, setHousekeeping] = useState(persisted.housekeeping || {})

  // UI state
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterState, setFilterState] = useState('All')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingReservation, setEditingReservation] = useState(null)

  useEffect(()=>{
    saveToStorage({ rooms, reservations, housekeeping })
  }, [rooms, reservations, housekeeping])

  // Compute derived room status
  function getRoomStatus(roomId){
    const hk = housekeeping[roomId] || 'clean'
    const today = formatDate(new Date())
    const active = reservations.find(r => r.roomId === roomId && (r.status === 'checked-in' || (r.status === 'reserved' && dateInRange(today, r.checkIn, r.checkOut)) ))
    if(active && active.status === 'checked-in') return 'Occupied'
    if(active && active.status === 'reserved') return 'Reserved'
    if(hk === 'dirty') return 'Dirty'
    return 'Available'
  }

  // Filtering rooms
  const roomList = rooms.filter(r => {
    if(filterType !== 'All' && r.type !== filterType) return false
    const status = getRoomStatus(r.id)
    if(filterState !== 'All' && status !== filterState) return false
    if(query){
      const q = query.toLowerCase()
      if(r.id.toLowerCase().includes(q)) return true
      const anyRes = reservations.some(res => res.roomId === r.id && res.guest.toLowerCase().includes(q))
      if(anyRes) return true
      return false
    }
    return true
  })

  // Reservations upcoming
  const upcoming = reservations.slice().sort((a,b)=> new Date(a.checkIn)-new Date(b.checkIn))

  // Actions
  function openNewReservation(room){
    setEditingReservation({ roomId: room?.id || '', guest: '', checkIn: formatDate(new Date()), checkOut: formatDate(new Date(Date.now()+24*60*60*1000)), status: 'reserved' })
    setShowModal(true)
  }

  function saveReservation(r){
    if(r.id){
      setReservations(prev => prev.map(p => p.id === r.id ? r : p))
    }else{
      r.id = uid('r')
      setReservations(prev => [...prev, r])
    }
    setShowModal(false)
  }

  function checkIn(resId){
    setReservations(prev => prev.map(r => r.id === resId ? {...r, status: 'checked-in'} : r))
  }
  function checkOut(resId){
    setReservations(prev => prev.map(r => r.id === resId ? {...r, status: 'checked-out'} : r))
    const r = reservations.find(x => x.id === resId)
    if(r) setHousekeeping(h => ({...h, [r.roomId]: 'dirty'}))
  }

  function toggleHousekeeping(roomId){
    setHousekeeping(h => ({...h, [roomId]: h[roomId] === 'dirty' ? 'clean' : 'dirty'}))
  }

  function exportReservationsCSV(){
    const header = ['id,guest,roomId,checkIn,checkOut,status']
    const lines = reservations.map(r => `${r.id},"${r.guest}",${r.roomId},${r.checkIn},${r.checkOut},${r.status}`)
    const csv = header.concat(lines).join('
')
    const blob = new Blob([csv], {type: 'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reservations.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 text-gray-800 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M16 3v4M8 3v4M3 11h18"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Hotel Staff Dashboard</h1>
              <p className="text-sm text-gray-500">Gestión de habitaciones y reservas — personal interno</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={()=>{ localStorage.removeItem('hotel_data'); window.location.reload() }} className="px-3 py-2 border rounded-md bg-white shadow-sm text-sm">Reset datos</button>
            <button onClick={exportReservationsCSV} className="px-3 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700 flex items-center text-sm"><IconExport/>Exportar</button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">

          {/* Sidebar */}
          <aside className="col-span-3 bg-white rounded-2xl p-4 shadow-md sticky top-6 h-fit">
            <div className="mb-4">
              <label className="block text-xs text-gray-500">Buscar</label>
              <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full mt-2 p-2 rounded-md border bg-gray-50" placeholder="Número de habitación o huésped" />
            </div>

            <div className="flex gap-2 mb-4">
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="flex-1 p-2 rounded-md border bg-white text-sm">
                <option>All</option>
                {[...new Set(rooms.map(r=>r.type))].map(t=> <option key={t}>{t}</option>)}
              </select>
              <select value={filterState} onChange={e=>setFilterState(e.target.value)} className="flex-1 p-2 rounded-md border bg-white text-sm">
                <option>All</option>
                <option>Available</option>
                <option>Reserved</option>
                <option>Occupied</option>
                <option>Dirty</option>
              </select>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Próximas reservas</h3>
              <ul className="space-y-2 max-h-48 overflow-auto">
                {upcoming.slice(0,6).map(r=> (
                  <li key={r.id} className="p-2 rounded-md border bg-gray-50 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold">{r.guest}</div>
                      <div className="text-xs text-gray-500">{r.roomId} · {r.checkIn} → {r.checkOut}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">{r.status}</div>
                      <div className="mt-1 flex gap-1 justify-end">
                        {r.status !== 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>{ setEditingReservation(r); setShowModal(true) }}>Editar</button>}
                        {r.status === 'reserved' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>checkIn(r.id)}>Check-in</button>}
                        {r.status === 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>checkOut(r.id)}>Check-out</button>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Housekeeping</h3>
              <ul className="space-y-2">
                {rooms.map(r => (
                  <li key={r.id} className="flex items-center justify-between text-sm p-2 rounded-md border bg-white">
                    <div className="font-medium">{r.id} <span className="text-xs text-gray-500">· {r.type}</span></div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600">{housekeeping[r.id] === 'dirty' ? 'Sucia' : 'Limpia'}</div>
                      <button aria-label={`Marcar limpieza ${r.id}`} className="text-xs px-2 py-1 rounded-md border" onClick={()=>toggleHousekeeping(r.id)}>Marcar</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </aside>

          {/* Main Grid */}
          <section className="col-span-6">
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Habitaciones</h2>
                <div className="text-sm text-gray-500">Mostrando <span className="font-medium">{roomList.length}</span> de {rooms.length}</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {roomList.map(room => {
                  const status = getRoomStatus(room.id)
                  return (
                    <div key={room.id} className="group relative border rounded-2xl p-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-2xl font-bold">{room.id}</div>
                          <div className="text-sm text-gray-500">{room.type} · Piso {room.floor}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <StatusBadge status={status} />
                          <div className="text-xs text-gray-400">{housekeeping[room.id] === 'dirty' ? 'Limpieza requerida' : ''}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700" onClick={()=>openNewReservation(room)}>Nueva reserva</button>
                        <button className="px-3 py-2 rounded-lg border text-sm" onClick={()=>{ setSelectedRoom(room); setShowModal(true); setEditingReservation(null) }}>Ver</button>
                      </div>

                      <div className="absolute -top-3 -left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-xs bg-white/80 backdrop-blur rounded-full px-2 py-1 border">ID</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Right details */}
          <aside className="col-span-3">
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <h3 className="text-lg font-semibold mb-3">Detalles</h3>
              {selectedRoom ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">{selectedRoom.id}</div>
                    <div>
                      <div className="text-lg font-bold">Habitación {selectedRoom.id}</div>
                      <div className="text-sm text-gray-500">{selectedRoom.type} · Piso {selectedRoom.floor}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Reservas</h4>
                    <ul className="space-y-2">
                      {reservations.filter(r=>r.roomId === selectedRoom.id).map(r=> (
                        <li key={r.id} className="p-2 rounded-md border bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{r.guest}</div>
                              <div className="text-xs text-gray-500">{r.checkIn} → {r.checkOut}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-600">{r.status}</div>
                              <div className="mt-1 flex gap-1">
                                {r.status !== 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>{ setEditingReservation(r); setShowModal(true) }}>Editar</button>}
                                {r.status === 'reserved' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>checkIn(r.id)}>Check-in</button>}
                                {r.status === 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>checkOut(r.id)}>Check-out</button>}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Housekeeping</h4>
                    <div className="flex items-center gap-3">
                      <div className="text-sm">Estado: <span className="font-medium">{housekeeping[selectedRoom.id] === 'dirty' ? 'Sucia' : 'Limpia'}</span></div>
                      <button className="px-3 py-1 rounded-md border" onClick={()=>toggleHousekeeping(selectedRoom.id)}>Marcar</button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-sm text-gray-500">Seleccione una habitación para ver detalles.</div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <button className="px-3 py-2 rounded-lg bg-gray-800 text-white" onClick={()=>{ setSelectedRoom(null); openNewReservation(null) }}>Crear reserva manual</button>
                <button className="px-3 py-2 rounded-lg border" onClick={()=>{ setReservations(prev => [...prev, { id: uid('r'), guest: 'Invitado', roomId: rooms[0].id, checkIn: formatDate(new Date()), checkOut: formatDate(new Date(Date.now()+24*60*60*1000)), status: 'reserved' }]) }}>Crear reserva demo</button>
              </div>
            </div>
          </aside>

        </div>

        {/* Modal */}
        {showModal && (
          <ReservationModal
            reservation={editingReservation}
            defaultRoom={selectedRoom}
            rooms={rooms}
            onClose={()=>{ setShowModal(false); setEditingReservation(null); setSelectedRoom(null) }}
            onSave={(r)=>saveReservation(r)}
          />
        )}

      </div>
    </div>
  )
}

// ---------- Reservation Modal Component ----------
function ReservationModal({ reservation, defaultRoom, rooms, onClose, onSave }){
  const [form, setForm] = useState(() => reservation ? {...reservation} : { guest: '', roomId: defaultRoom ? defaultRoom.id : rooms[0].id, checkIn: formatDate(new Date()), checkOut: formatDate(new Date(Date.now()+24*60*60*1000)), status: 'reserved' })

  useEffect(()=>{
    if(reservation) setForm({...reservation})
  }, [reservation])

  function update(field, value){
    setForm(f => ({...f, [field]: value}))
  }

  function submit(e){
    e.preventDefault()
    if(!form.guest) return alert('Ingrese nombre del huésped')
    if(new Date(form.checkOut) <= new Date(form.checkIn)) return alert('Fecha de check-out debe ser posterior al check-in')
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onSubmit={submit}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold">{form.id ? 'Editar reserva' : 'Nueva reserva'}</h3>
          <button type="button" aria-label="Cerrar" className="text-gray-500" onClick={onClose}>&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Huésped</label>
            <input value={form.guest} onChange={e=>update('guest', e.target.value)} className="w-full mt-2 p-2 rounded-md border" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Habitación</label>
            <select value={form.roomId} onChange={e=>update('roomId', e.target.value)} className="w-full mt-2 p-2 rounded-md border">
              {rooms.map(r=> <option key={r.id} value={r.id}>{r.id} • {r.type}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600">Check-in</label>
            <input type="date" value={form.checkIn} onChange={e=>update('checkIn', e.target.value)} className="w-full mt-2 p-2 rounded-md border" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Check-out</label>
            <input type="date" value={form.checkOut} onChange={e=>update('checkOut', e.target.value)} className="w-full mt-2 p-2 rounded-md border" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-600">Estado</label>
            <select className="w-full mt-2 p-2 rounded-md border" value={form.status} onChange={e=>update('status', e.target.value)}>
              <option value="reserved">Reservado</option>
              <option value="checked-in">Checked-in</option>
              <option value="checked-out">Checked-out</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="px-4 py-2 border rounded-md" onClick={onClose}>Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Guardar</button>
        </div>
      </form>
    </div>
  )
}
