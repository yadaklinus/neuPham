"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  matricNumber: string
  email?: string
  phone?: string
  department?: string
  bloodGroup?: string
  genotype?: string
  allergies?: string
}

interface SearchableStudentDropdownProps {
  students: Student[]
  selectedStudent: string
  onStudentChange: (studentId: string) => void
  placeholder?: string
  className?: string
}

export default function SearchableStudentDropdown({
  students,
  selectedStudent,
  onStudentChange,
  placeholder = "Search students...",
  className
}: SearchableStudentDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const selectedStudentData = students?.find((s) => s.id === selectedStudent)

  const filteredStudents = useMemo(() => {
    if (!students) return []
    
    const query = searchQuery.toLowerCase().trim()
    
    // If no search query, return first 20 students
    if (query.length === 0) {
      return students.slice(0, 20)
    }
    
    // If search query is too short, return empty to encourage more typing
    if (query.length < 2) {
      return []
    }
    
    // Filter students based on search query
    const filtered = students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.matricNumber.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.department?.toLowerCase().includes(query) ||
        student.phone?.includes(query)
      )
    })
    
    // Return filtered results, limited to 50 for performance
    return filtered.slice(0, 50)
  }, [students, searchQuery])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleStudentSelect = (studentId: string) => {
    onStudentChange(studentId)
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Student Information</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between bg-transparent",
              selectedStudent && "bg-blue-50 border-blue-200 text-blue-900"
            )}
          >
            {selectedStudent ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{selectedStudentData?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedStudentData?.matricNumber} • {selectedStudentData?.department || 'N/A'}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-auto">
                  Selected
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{placeholder}</span>
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Type student name, matric number, or department..." 
              className="h-9"
              value={searchQuery}
              onValueChange={handleSearchChange}
            />
            <CommandList className="max-h-[300px] overflow-auto">
              {filteredStudents.length === 0 ? (
                <CommandEmpty>
                  {searchQuery.length === 0 
                    ? "Start typing to search students..." 
                    : searchQuery.length < 2
                    ? "Type at least 2 characters to search..."
                    : "No students found"}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {searchQuery.length === 0 && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                      Showing first 20 students - type to search all students
                    </div>
                  )}
                  {searchQuery.length >= 2 && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                      Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudent === student.id
                    
                    return (
                      <CommandItem
                        key={student.id}
                        value={`${student.name} ${student.matricNumber} ${student.department || ''}`}
                        onSelect={() => handleStudentSelect(student.id)}
                        className={cn(
                          "group flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors",
                          "hover:bg-blue-600 hover:text-white",
                          "data-[selected=true]:bg-blue-600 data-[selected=true]:text-white",
                          "focus:bg-blue-600 focus:text-white",
                          "aria-selected:bg-blue-600 aria-selected:text-white",
                          isSelected && "bg-blue-50 border-l-4 border-blue-500"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className={cn(
                                "font-medium transition-colors",
                                isSelected && "text-blue-900"
                              )}>
                                {student.name}
                              </div>
                              <div className="text-sm transition-colors group-hover:text-blue-100">
                                {student.matricNumber}
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="default" className="bg-blue-600 ml-2">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-sm transition-colors group-hover:text-blue-100">
                          <span>
                            {student.department || 'No Department'} • {student.phone || 'No Phone'}
                          </span>
                          {student.bloodGroup && (
                            <Badge variant="outline" className="text-xs transition-colors group-hover:border-blue-100 group-hover:text-blue-100">
                              {student.bloodGroup}
                            </Badge>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="absolute right-2 top-2 h-4 w-4 text-blue-600 transition-colors group-hover:text-white" />
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Quick stats when dropdown is closed */}
      {!open && students && (
        <div className="text-xs text-muted-foreground">
          {students.length} total students available
        </div>
      )}

      {/* Selected Student Information Display */}
      {selectedStudentData && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Blood Group:</span> {selectedStudentData.bloodGroup || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Genotype:</span> {selectedStudentData.genotype || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Department:</span> {selectedStudentData.department || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {selectedStudentData.phone || 'N/A'}
            </div>
            {selectedStudentData.allergies && (
              <div className="col-span-2">
                <span className="font-medium text-red-600">Allergies:</span> {selectedStudentData.allergies}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}