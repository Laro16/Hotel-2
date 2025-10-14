/*
Hotel Staff Dashboard (Single-file React component)

Instrucciones rápidas:
1) Proyecto: funciona en Vite o Create React App con TailwindCSS configurado.
2) Guardar este archivo como src/HotelDashboard.jsx
3) Importar en src/main.jsx o src/App.jsx: import HotelDashboard from './HotelDashboard'
4) Asegúrate de tener Tailwind configurado (clases usadas) y opcionalmente instala lucide-react / shadcn si quieres mejorar iconos.

Características incluidas:
- Vista de habitaciones (grid) con estados: Disponible, Ocupada, Limpia, Sucia
- Filtros (estado, tipo de habitación)
- Búsqueda por número o huésped
- Gestión de reservas: Crear, Editar, Check-in, Check-out
- Panel de Housekeeping: marcar limpieza
- Lista de reservas próximas
- Persistencia local (localStorage) para pruebas
- Exportar lista de reservas a CSV

Este archivo es un punto de partida completo y auto-contenido (sin backend). Sustituye las funciones de persistencia por API calls cuando tengas servidor.
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
    status: 'reserved' // reserved, checked-in, checked-out, cancelled
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

// Estados de habitación derivados de reservas y housekeeping

function uid(prefix = ''){
  return prefix + Math.random().toString(36).slice(2,9)
}

// ---------- Helpers ----------
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
    // housekeeping[roomId] = 'clean'|'dirty' (optional)
    const hk = housekeeping[roomId] || 'clean'
    // check reservations to see if someone is checked-in for today
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
      // check reservations guest name
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
    // mark room dirty for housekeeping
    const r = reservations.find(x => x.id === resId)
    if(r) setHousekeeping(h => ({...h, [r.roomId]: 'dirty'}))
  }

  function toggleHousekeeping(roomId){
    setHousekeeping(h => ({...h, [roomId]: h[roomId] === 'dirty' ? 'clean' : 'dirty'}))
  }

  function exportReservationsCSV(){
    const header = ['id,guest,roomId,checkIn,checkOut,status']
    const lines = reservations.map(r => `${r.id},"${r.guest}",${r.roomId},${r.checkIn},${r.checkOut},${r.status}`)
    const csv = header.concat(lines).join('\\n')
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Panel Hotel - Gestión de reservas</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border rounded shadow-sm" onClick={()=>{ localStorage.removeItem('hotel_data'); window.location.reload() }}>Reset datos</button>
            <button className="px-3 py-1 bg-white border rounded shadow-sm" onClick={exportReservationsCSV}>Exportar reservas</button>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          {/* Left: controls + upcoming reservations */}
          <aside className="col-span-3 bg-white p-4 rounded shadow-sm">
            <div className="mb-4">
              <label className="block text-sm">Buscar</label>
              <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="Número de habitación o huésped" />
            </div>
            <div className="flex gap-2 mb-4">
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="flex-1 border rounded p-2">
                <option>All</option>
                {[...new Set(rooms.map(r=>r.type))].map(t=> <option key={t}>{t}</option>)}
              </select>
              <select value={filterState} onChange={e=>setFilterState(e.target.value)} className="flex-1 border rounded p-2">
                <option>All</option>
                <option>Available</option>
                <option>Reserved</option>
                <option>Occupied</option>
                <option>Dirty</option>
              </select>
            </div>

            <div className="mb-4">
              <h3 className="font-medium">Próximas reservas</h3>
              <ul className="mt-2 space-y-2 max-h-52 overflow-auto">
                {upcoming.slice(0,8).map(r=> (
                  <li key={r.id} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{r.guest}</div>
                      <div className="text-xs text-gray-500">{r.roomId} • {r.checkIn} → {r.checkOut}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs">{r.status}</div>
                      <div className="mt-1 flex gap-1">
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
              <h3 className="font-medium">Housekeeping</h3>
              <ul className="mt-2 space-y-2">
                {rooms.map(r => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <div>{r.id} • {r.type}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs">{housekeeping[r.id] === 'dirty' ? 'Sucia' : 'Limpia'}</div>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=>toggleHousekeeping(r.id)}>Marcar</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </aside>

          {/* Middle: room grid */}
          <section className="col-span-6 bg-white p-4 rounded shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Habitaciones</h2>
              <div className="text-sm text-gray-500">Mostrando {roomList.length} de {rooms.length}</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {roomList.map(room => {
                const status = getRoomStatus(room.id)
                return (
                  <div key={room.id} className="border rounded p-3 bg-white shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xl font-semibold">{room.id}</div>
                        <div className="text-xs text-gray-500">{room.type} • Piso {room.floor}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-medium">{status}</div>
                        <div className="text-xs">{housekeeping[room.id] === 'dirty' ? 'Limpieza requerida' : ''}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 px-2 py-1 border rounded text-sm" onClick={()=>openNewReservation(room)}>Nueva reserva</button>
                      <button className="px-2 py-1 border rounded text-sm" onClick={()=>{ setSelectedRoom(room); setShowModal(true); setEditingReservation(null) }}>Ver</button>
                    </div>
                  </div>
                )
              })}
            </div>

          </section>

          {/* Right: details + actions */}
          <aside className="col-span-3 bg-white p-4 rounded shadow-sm">
            <h3 className="font-medium mb-2">Detalles</h3>
            {selectedRoom ? (
              <div>
                <div className="text-xl font-semibold">{selectedRoom.id}</div>
                <div className="text-sm text-gray-500">{selectedRoom.type} • Piso {selectedRoom.floor}</div>
                <div className="mt-3">
                  <h4 className="font-medium">Reservas en esta habitación</h4>
                  <ul className="mt-2 space-y-2">
                    {reservations.filter(r=>r.roomId === selectedRoom.id).map(r=> (
                      <li key={r.id} className="p-2 border rounded">
                        <div className="text-sm font-medium">{r.guest}</div>
                        <div className="text-xs text-gray-500">{r.checkIn} → {r.checkOut} • {r.status}</div>
                        <div className="mt-2 flex gap-2">
                          {r.status !== 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>{ setEditingReservation(r); setShowModal(true) }}>Editar</button>}
                          {r.status === 'reserved' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>checkIn(r.id)}>Check-in</button>}
                          {r.status === 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>checkOut(r.id)}>Check-out</button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium">Housekeeping</h4>
                  <div className="mt-2 flex gap-2 items-center">
                    <div className="text-sm">Estado: {housekeeping[selectedRoom.id] === 'dirty' ? 'Sucia' : 'Limpia'}</div>
                    <button className="px-2 py-1 border rounded" onClick={()=>toggleHousekeeping(selectedRoom.id)}>Marcar</button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-sm text-gray-500">Seleccione una habitación para ver detalles.</div>
            )}

            <div className="mt-6">
              <h4 className="font-medium mb-2">Acciones rápidas</h4>
              <div className="flex flex-col gap-2">
                <button className="px-3 py-2 border rounded" onClick={()=>{ setSelectedRoom(null); openNewReservation(null) }}>Crear reserva manual</button>
                <button className="px-3 py-2 border rounded" onClick={()=>{ setReservations(prev => [...prev, { id: uid('r'), guest: 'Invitado', roomId: rooms[0].id, checkIn: formatDate(new Date()), checkOut: formatDate(new Date(Date.now()+24*60*60*1000)), status: 'reserved' }]) }}>Crear reserva demo</button>
              </div>
            </div>

          </aside>
        </main>

        {/* Modal for create/edit reservation */}
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
    // basic validation
    if(!form.guest) return alert('Ingrese nombre del huésped')
    if(new Date(form.checkOut) <= new Date(form.checkIn)) return alert('Fecha de check-out debe ser posterior al check-in')
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form className="bg-white rounded p-6 w-full max-w-md" onSubmit={submit}>
        <h3 className="text-lg font-medium mb-4">{form.id ? 'Editar reserva' : 'Nueva reserva'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Huésped</label>
            <input value={form.guest} onChange={e=>update('guest', e.target.value)} className="w-full border rounded p-2 mt-1" />
          </div>
          <div>
            <label className="block text-sm">Habitación</label>
            <select value={form.roomId} onChange={e=>update('roomId', e.target.value)} className="w-full border rounded p-2 mt-1">
              {rooms.map(r=> <option key={r.id} value={r.id}>{r.id} • {r.type}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm">Check-in</label>
              <input type="date" value={form.checkIn} onChange={e=>update('checkIn', e.target.value)} className="w-full border rounded p-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm">Check-out</label>
              <input type="date" value={form.checkOut} onChange={e=>update('checkOut', e.target.value)} className="w-full border rounded p-2 mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm">Estado</label>
            <select className="w-full border rounded p-2 mt-1" value={form.status} onChange={e=>update('status', e.target.value)}>
              <option value="reserved">Reservado</option>
              <option value="checked-in">Checked-in</option>
              <option value="checked-out">Checked-out</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-3 py-2 border rounded" onClick={onClose}>Cancelar</button>
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
          </div>
        </div>
      </form>
    </div>
  )
}
