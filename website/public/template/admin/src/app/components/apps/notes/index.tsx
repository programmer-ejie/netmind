'use client'

import { useEffect, useState } from 'react'
import CardBox from '@/app/components/shared/CardBox'
import NotesSidebar from '@/app/components/apps/notes/NotesSidebar'
import NoteContent from '@/app/components/apps/notes/NoteContent'
import { Icon } from '@iconify/react'
import { usePathname } from 'next/navigation'
import { NotesType } from '@/app/(DashboardLayout)/types/apps/notes'
import AddNotes from './AddNotes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NotesData } from '@/app/data/notes'

interface colorsType {
  lineColor: string
  disp: string | any
  id: number
}

const NotesApp = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState<NotesType[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const location = usePathname()

  const handleClose = () => setIsOpen(false)

  const fetchNotes = async () => {
    try {
      setLoading(true)
      // Use static data instead of API
      setNotes(NotesData)
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetTickets = async () => {
    // Reset to static data
    fetchNotes()
  }

  const colorvariation: colorsType[] = [
    {
      id: 1,
      lineColor: 'warning',
      disp: 'warning',
    },
    {
      id: 2,
      lineColor: 'primary',
      disp: 'primary',
    },
    {
      id: 3,
      lineColor: 'error',
      disp: 'error',
    },
    {
      id: 4,
      lineColor: 'success',
      disp: 'success',
    },
    {
      id: 5,
      lineColor: 'secondary',
      disp: 'secondary',
    },
  ]

  useEffect(() => {
    const isPageRefreshed = sessionStorage.getItem('isPageRefreshed')
    if (isPageRefreshed === 'true') {
      sessionStorage.removeItem('isPageRefreshed')
      handleResetTickets()
    } else {
      fetchNotes()
    }
  }, [location])

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('isPageRefreshed', 'true')
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const updateNote = (id: string, title: string, color: string) => {
    setNotes((prev) =>
      prev.map((note: any) =>
        note.id === id ? { ...note, title, color } : note
      )
    )
    // No API call for static site
  }

  useEffect(() => {
    if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id)
    }
  }, [notes, selectedNoteId])

  const addNote = async (note: { title: string; color: string }) => {
    try {
      // Simulate adding note locally
      const newNote: NotesType = {
        id: Math.max(...notes.map(n => n.id)) + 1,
        title: note.title,
        color: note.color,
        datef: new Date().toISOString(),
        deleted: false,
      };
      setNotes((prev) => [...prev, newNote]);
      setSelectedNoteId(newNote.id);
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  return (
    <CardBox className='p-0 overflow-hidden bg-background'>
      <div className='flex'>
        {/* Sidebar */}
        <div>
          <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent
              side='left'
              className='max-w-[320px] sm:max-w-[320px] w-full h-full lg:z-0 lg:hidden block'>
              <NotesSidebar
                notes={notes}
                loading={loading}
                onSelectNote={(id: any) => setSelectedNoteId(id)}
                onDeleteNote={(id: any) => {
                  setNotes((prev) => prev.filter((n) => n.id !== id))
                  if (selectedNoteId === id) setSelectedNoteId(null)
                }}
              />
            </SheetContent>
          </Sheet>
          <div className='max-w-[320px] h-auto lg:block hidden'>
            <NotesSidebar
              notes={notes}
              loading={loading}
              onSelectNote={(id: any) => setSelectedNoteId(id)}
              onDeleteNote={(id: any) => {
                setNotes((prev) => prev.filter((n) => n.id !== id))
                if (selectedNoteId === id) setSelectedNoteId(null)
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className='w-full'>
          <div className='flex justify-between items-center border-b border-ld py-4 px-6'>
            <div className='flex gap-3 items-center'>
              <Button
                color={'lightprimary'}
                onClick={() => setIsOpen(true)}
                className='btn-circle p-0 lg:!hidden flex '>
                <Icon icon='tabler:menu-2' height={18} />
              </Button>
              <h6 className='text-base'>Edit Note</h6>
            </div>
            <AddNotes colors={colorvariation} addNote={addNote} />
          </div>

          <NoteContent
            note={notes.find((n: any) => n.id === selectedNoteId) || null}
            updateNote={updateNote}
          />
        </div>
      </div>
    </CardBox>
  )
}

export default NotesApp
