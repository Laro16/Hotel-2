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

// ---------- Iconos SVG (para no instalar dependencias) ----------
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
const BedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16h20V4H2z"></path><path d="M2 10h20"></path><path d="M12 4v6"></path></svg>
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.5 12.5"/><path d="M2 12.5a10 10 0 0 0 18.5-1"/></svg>

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
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()) // Ajustar a UTC para input date
  return dt.toISOString().slice(0,10)
}

function dateInRange(dateStr, startStr, endStr){
  const date = new Date(dateStr)
  const start = new Date(startStr)
  const end = new Date(endStr)
  return date >= start && date < end
}

// ---------- Mapeo de estilos ----------
const statusColors = {
  Available: 'bg-green-100 text-green-800 border-green-200',
  Occupied: 'bg-red-100 text-red-800 border-red-200',
  Reserved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Dirty: 'bg-orange-100 text-orange-800 border-orange-200',
}
const statusText = {
  Available: 'Disponible',
  Occupied: 'Ocupada',
  Reserved: 'Reservada',
  Dirty: 'Sucia',
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

  // Upcoming reservations
  const upcoming = reservations.filter(r => new Date(r.checkIn) >= new Date(formatDate(new Date())) && (r.status === 'reserved' || r.status === 'checked-in')).slice().sort((a,b)=> new Date(a.checkIn)-new Date(b.checkIn))

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
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6">
        <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Hotel</h1>
            <p className="text-gray-500 mt-1">Gestión de habitaciones y reservas</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors" onClick={()=>{ localStorage.removeItem('hotel_data'); window.location.reload() }}><ResetIcon/> Resetear datos</button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors" onClick={exportReservationsCSV}><ExportIcon/> Exportar</button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 space-y-6">
            {/* Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative col-span-1 sm:col-span-3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon/></div>
                  <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Buscar por habitación o huésped..." />
                </div>
                <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                  <option value="All">Todo tipo</option>
                  {[...new Set(rooms.map(r=>r.type))].map(t=> <option key={t}>{t}</option>)}
                </select>
                <select value={filterState} onChange={e=>setFilterState(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                  <option value="All">Todo estado</option>
                  {Object.keys(statusText).map(s=> <option key={s} value={s}>{statusText[s]}</option>)}
                </select>
              </div>
            </div>

            {/* Room grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Habitaciones</h2>
                <div className="text-sm text-gray-500">Mostrando {roomList.length} de {rooms.length}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {roomList.map(room => {
                  const status = getRoomStatus(room.id)
                  return (
                    <div key={room.id} className={`border rounded-lg p-4 bg-white shadow-sm transition-transform hover:scale-105 hover:shadow-md ${statusColors[status]}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-2xl font-bold">{room.id}</div>
                          <div className="text-xs opacity-70">{room.type} • Piso {room.floor}</div>
                        </div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[status]}`}>{statusText[status]}</div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className="flex-1 px-2 py-1 bg-black/5 hover:bg-black/10 text-xs font-bold rounded" onClick={()=>openNewReservation(room)}>Reservar</button>
                        <button className="px-2 py-1 bg-black/5 hover:bg-black/10 text-xs font-bold rounded" onClick={()=>{ setSelectedRoom(room); setEditingReservation(null) }}>Detalles</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">Acciones Rápidas</h3>
              <button onClick={() => { setSelectedRoom(null); openNewReservation(null) }} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm font-medium hover:bg-blue-700 transition-colors">
                <PlusIcon/> Nueva Reserva
              </button>
            </div>
            
            {selectedRoom ? (
              <RoomDetails
                room={selectedRoom}
                reservations={reservations.filter(r=>r.roomId === selectedRoom.id)}
                housekeeping={housekeeping[selectedRoom.id]}
                onEdit={r => { setEditingReservation(r); setShowModal(true) }}
                onCheckIn={checkIn}
                onCheckOut={checkOut}
                onToggleHk={toggleHousekeeping}
              />
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Próximas Reservas</h3>
                <ul className="space-y-3 max-h-80 overflow-auto">
                  {upcoming.length > 0 ? upcoming.slice(0, 5).map(r => (
                    <li key={r.id} className="p-3 border rounded-md flex items-start gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-md font-bold text-sm">{r.roomId}</div>
                      <div>
                        <div className="font-medium">{r.guest}</div>
                        <div className="text-xs text-gray-500">{r.checkIn} → {r.checkOut}</div>
                        <div className="text-xs font-semibold mt-1 capitalize">{r.status}</div>
                      </div>
                    </li>
                  )) : <p className="text-sm text-gray-500">No hay reservas próximas.</p>}
                </ul>
              </div>
            )}
          </aside>
        </main>

        {/* Modal for create/edit reservation */}
        {showModal && (
          <ReservationModal
            reservation={editingReservation}
            defaultRoom={selectedRoom}
            rooms={rooms}
            onClose={()=>{ setShowModal(false); setEditingReservation(null) }}
            onSave={(r)=>saveReservation(r)}
          />
        )}
      </div>
    </div>
  )
}

function RoomDetails({ room, reservations, housekeeping, onEdit, onCheckIn, onCheckOut, onToggleHk }){
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b pb-3 mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">Detalles de Habitación</h3>
        <p className="text-3xl font-bold">{room.id} <span className="text-lg font-normal text-gray-500">({room.type})</span></p>
      </div>
      <div>
        <h4 className="font-medium mb-2">Reservas</h4>
        <ul className="space-y-2 max-h-60 overflow-auto pr-2">
          {reservations.length > 0 ? reservations.map(r => (
            <li key={r.id} className="p-2 border rounded-md">
              <div className="text-sm font-medium">{r.guest}</div>
              <div className="text-xs text-gray-500">{r.checkIn} → {r.checkOut} • {r.status}</div>
              <div className="mt-2 flex gap-2">
                {r.status !== 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>onEdit(r)}>Editar</button>}
                {r.status === 'reserved' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>onCheckIn(r.id)}>Check-in</button>}
                {r.status === 'checked-in' && <button className="text-xs px-2 py-1 border rounded" onClick={()=>onCheckOut(r.id)}>Check-out</button>}
              </div>
            </li>
          )) : <p className="text-sm text-gray-500">No hay reservas para esta habitación.</p>}
        </ul>
      </div>
      <div className="mt-4 pt-4 border-t">
        <h4 className="font-medium">Housekeeping</h4>
        <div className="mt-2 flex gap-2 items-center justify-between">
          <div className="text-sm">Estado: <span className={`font-semibold ${housekeeping === 'dirty' ? 'text-orange-600' : 'text-green-600'}`}>{housekeeping === 'dirty' ? 'Sucia' : 'Limpia'}</span></div>
          <button className="px-2 py-1 border rounded text-xs" onClick={()=>onToggleHk(room.id)}>Cambiar</button>
        </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md" onSubmit={submit}>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">{form.id ? 'Editar Reserva' : 'Nueva Reserva'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Huésped</label>
            <input value={form.guest} onChange={e=>update('guest', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Habitación</label>
            <select value={form.roomId} onChange={e=>update('roomId', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              {rooms.map(r=> <option key={r.id} value={r.id}>{r.id} • {r.type}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Check-in</label>
              <input type="date" value={form.checkIn} onChange={e=>update('checkIn', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Check-out</label>
              <input type="date" value={form.checkOut} onChange={e=>update('checkOut', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select className="w-full border border-gray-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.status} onChange={e=>update('status', e.target.value)}>
              <option value="reserved">Reservado</option>
              <option value="checked-in">Checked-in</option>
              <option value="checked-out">Checked-out</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50" onClick={onClose}>Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Guardar Reserva</button>
          </div>
        </div>
      </form>
    </div>
  )
}
