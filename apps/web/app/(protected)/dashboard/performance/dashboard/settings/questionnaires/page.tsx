'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Eye, Edit, Trash2, CheckCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Question {
  id: string
  statement: string
  order: number
  requiresComment: boolean
}

interface Subsection {
  id: string
  title: string
  institutionalValue?: string
  order: number
  questions: Question[]
}

interface OpenEndedQuestion {
  id: string
  question: string
  order: number
  isRequired: boolean
}

interface Section {
  id: string
  title: string
  description?: string
  order: number
  subsections: Subsection[]
  openEndedQuestions: OpenEndedQuestion[]
}

interface QuestionnaireTemplate {
  id: string
  name: string
  description?: string
  instructions?: string
  ratingScaleDesc?: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
  sections: Section[]
}

export default function QuestionnairesPage() {
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionnaireTemplate | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/questionnaires')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching questionnaires:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (template: QuestionnaireTemplate) => {
    setSelectedTemplate(template)
    setPreviewOpen(true)
  }

  const getTotalQuestions = (template: QuestionnaireTemplate) => {
    let total = 0
    template.sections.forEach(section => {
      section.subsections.forEach(subsection => {
        total += subsection.questions.length
      })
      total += section.openEndedQuestions.length
    })
    return total
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="text-center py-8 text-gray-500">Loading questionnaires...</div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">360° Feedback Questionnaires</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Manage feedback questionnaires based on institutional values</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create New Questionnaire
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No questionnaires found</p>
              <p className="text-gray-400 text-sm mt-2">
                Create your first questionnaire to start collecting 360° feedback
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {template.name}
                    </CardTitle>
                    {template.description && (
                      <CardDescription className="mt-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {template.isDefault && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  {template.isActive && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Sections</p>
                      <p className="font-semibold text-lg">{template.sections.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Questions</p>
                      <p className="font-semibold text-lg">{getTotalQuestions(template)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6 mt-4">
              {/* Instructions */}
              {selectedTemplate.instructions && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm">Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {selectedTemplate.instructions}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Rating Scale */}
              {selectedTemplate.ratingScaleDesc && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-sm">Rating Scale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-line font-mono">
                      {selectedTemplate.ratingScaleDesc}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Sections */}
              {selectedTemplate.sections.map((section, sectionIndex) => (
                <Card key={section.id} className="border-2">
                  <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                        {sectionIndex + 1}
                      </span>
                      {section.title}
                    </CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Subsections with rating questions */}
                    {section.subsections.map((subsection) => (
                      <div key={subsection.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{subsection.title}</h4>
                          {subsection.institutionalValue && (
                            <Badge variant="outline" className="text-xs">
                              {subsection.institutionalValue}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          {subsection.questions.map((question, qIndex) => (
                            <div key={question.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-semibold text-gray-500 min-w-[24px]">
                                {qIndex + 1}.
                              </span>
                              <p className="text-sm text-gray-700 flex-1">{question.statement}</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <div
                                    key={rating}
                                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center text-xs text-gray-500"
                                  >
                                    {rating}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Open-ended questions */}
                    {section.openEndedQuestions.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-gray-900">Open-Ended Questions</h4>
                        <div className="space-y-3">
                          {section.openEndedQuestions.map((question, qIndex) => (
                            <div key={question.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex gap-2 items-start">
                                <span className="text-sm font-semibold text-gray-500">
                                  {qIndex + 1}.
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-700">{question.question}</p>
                                  {question.isRequired && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
