"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronRight, ChevronLeft } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: {
    id: string;
    name: string;
    division: {
      id: string;
      name: string;
    };
  };
}

interface Target {
  id?: string;
  title: string;
  description: string;
  dueDate: string;
  assignedToId: string;
}

interface Initiative {
  id?: string;
  number: string;
  initiative: string;
  measure: string;
  action: string;
  reportingPeriods: string[];
  quarterDates: { [key: string]: string };
  target: string;
  primaryResponsibility: string;
  secondaryResponsibility?: string;
  targets: Target[];
}

interface Objective {
  id?: string;
  code: string;
  title: string;
  description: string;
  initiatives: Initiative[];
}

interface Goal {
  id: string;
  goalNumber: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  objectives: any[];
}

interface EditGoalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: User[];
  goal: Goal | null;
}

export function EditGoalWizard({
  open,
  onOpenChange,
  onSuccess,
  users,
  goal,
}: EditGoalWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingGoalNumbers, setExistingGoalNumbers] = useState<string[]>([]);
  const [existingGoalTitles, setExistingGoalTitles] = useState<string[]>([]);
  const [existingObjectiveCodes, setExistingObjectiveCodes] = useState<
    string[]
  >([]);
  const [existingInitiativeNumbers, setExistingInitiativeNumbers] = useState<
    string[]
  >([]);

  // Goal data
  const [goalData, setGoalData] = useState({
    goalNumber: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  // Objectives
  const [objectives, setObjectives] = useState<Objective[]>([
    { code: "", title: "", description: "", initiatives: [] },
  ]);

  const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0);
  const [currentInitiativeIndex, setCurrentInitiativeIndex] = useState(0);

  const currentObjective = objectives[currentObjectiveIndex];
  const currentInitiative =
    currentObjective?.initiatives[currentInitiativeIndex];

  // Fetch existing goal numbers and objective codes
  const fetchExistingData = async () => {
    try {
      const response = await fetch("/dashboard/performance/api/goals");
      if (response.ok) {
        const goals = await response.json();
        // Extract unique goal numbers and titles
        const goalNumbers = Array.from(
          new Set(goals.map((g: any) => String(g.goalNumber))),
        ) as string[];
        const goalTitles = Array.from(
          new Set(goals.map((g: any) => String(g.title))),
        ) as string[];
        setExistingGoalNumbers(goalNumbers.sort());
        setExistingGoalTitles(goalTitles.sort());

        // Extract unique objective codes
        const objectiveCodes: string[] = [];
        const initiativeNumbers: string[] = [];
        goals.forEach((g: any) => {
          g.objectives?.forEach((obj: any) => {
            const code = obj.title.split("-")[0]?.trim() || obj.code;
            if (code) objectiveCodes.push(code);

            // Extract initiative numbers
            obj.initiatives?.forEach((init: any) => {
              if (init.number) initiativeNumbers.push(init.number);
            });
          });
        });
        setExistingObjectiveCodes([...new Set(objectiveCodes)].sort());
        setExistingInitiativeNumbers([...new Set(initiativeNumbers)].sort());
      }
    } catch (error) {
      console.error("Failed to fetch existing data:", error);
    }
  };

  // Load goal data when dialog opens
  useEffect(() => {
    if (open && goal) {
      setLoading(true);

      // Set basic goal data
      setGoalData({
        goalNumber: goal.goalNumber,
        title: goal.title,
        description: goal.description || "",
        startDate: new Date(goal.startDate).toISOString().split("T")[0],
        endDate: new Date(goal.endDate).toISOString().split("T")[0],
      });

      // Transform objectives and initiatives
      const transformedObjectives = goal.objectives.map((obj) => ({
        id: obj.id,
        code: obj.title.split("-")[0]?.trim() || "",
        title: obj.title,
        description: obj.description || "",
        initiatives:
          obj.initiatives?.map((init: any) => ({
            id: init.id,
            number: init.number || "",
            initiative: init.title || "",
            measure: init.measure || "",
            action: init.action || "",
            reportingPeriods: init.reportingPeriods || [],
            quarterDates: init.quarterDates || {},
            target: init.target || "",
            primaryResponsibility: init.primaryResponsibility || "",
            secondaryResponsibility: init.secondaryResponsibility || "",
            targets:
              init.targets?.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description || "",
                dueDate: t.dueDate
                  ? new Date(t.dueDate).toISOString().split("T")[0]
                  : "",
                assignedToId: t.responsibleId || "",
              })) || [],
          })) || [],
      }));

      setObjectives(
        transformedObjectives.length > 0
          ? transformedObjectives
          : [{ code: "", title: "", description: "", initiatives: [] }],
      );
      setCurrentObjectiveIndex(0);
      setCurrentInitiativeIndex(0);
      setLoading(false);
    }

    // Fetch existing data for autocomplete
    if (open) {
      fetchExistingData();
    }
  }, [open, goal]);

  const addObjective = () => {
    setObjectives([
      ...objectives,
      { code: "", title: "", description: "", initiatives: [] },
    ]);
    setCurrentObjectiveIndex(objectives.length);
    setCurrentInitiativeIndex(0);
  };

  const removeObjective = (index: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this objective? All associated initiatives will also be removed.",
      )
    ) {
      return;
    }
    const newObjectives = objectives.filter((_, i) => i !== index);
    setObjectives(newObjectives);
    if (currentObjectiveIndex >= newObjectives.length) {
      setCurrentObjectiveIndex(Math.max(0, newObjectives.length - 1));
    }
  };

  const updateObjective = (index: number, field: string, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = { ...newObjectives[index], [field]: value };
    setObjectives(newObjectives);
  };

  const addInitiative = () => {
    const newObjectives = [...objectives];
    if (!newObjectives[currentObjectiveIndex].initiatives) {
      newObjectives[currentObjectiveIndex].initiatives = [];
    }
    newObjectives[currentObjectiveIndex].initiatives.push({
      number: "",
      initiative: "",
      measure: "",
      action: "",
      reportingPeriods: [],
      quarterDates: {},
      target: "",
      primaryResponsibility: "",
      secondaryResponsibility: "",
      targets: [],
    });
    setObjectives(newObjectives);
    setCurrentInitiativeIndex(
      newObjectives[currentObjectiveIndex].initiatives.length - 1,
    );
  };

  const removeInitiative = (objIndex: number, initIndex: number) => {
    const newObjectives = [...objectives];
    newObjectives[objIndex].initiatives = newObjectives[
      objIndex
    ].initiatives.filter((_, i) => i !== initIndex);
    setObjectives(newObjectives);
    if (currentInitiativeIndex >= newObjectives[objIndex].initiatives.length) {
      setCurrentInitiativeIndex(
        Math.max(0, newObjectives[objIndex].initiatives.length - 1),
      );
    }
  };

  const updateInitiative = (
    objIndex: number,
    initIndex: number,
    field: string,
    value: any,
  ) => {
    const newObjectives = [...objectives];
    newObjectives[objIndex].initiatives[initIndex] = {
      ...newObjectives[objIndex].initiatives[initIndex],
      [field]: value,
    };
    setObjectives(newObjectives);
  };

  const handleSubmit = async () => {
    if (!goal) return;

    setSubmitting(true);
    try {
      // Update goal basic info
      const goalPayload = {
        title: goalData.title,
        startDate: goalData.startDate,
        endDate: goalData.endDate,
      };

      const goalResponse = await fetch(
        `/dashboard/performance/api/goals/${goal.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goalPayload),
        },
      );

      if (!goalResponse.ok) {
        const errorData = await goalResponse.json();
        throw new Error(`Failed to update goal: ${JSON.stringify(errorData)}`);
      }

      // Delete removed objectives
      const existingObjectiveIds = goal.objectives.map((o) => o.id);
      const currentObjectiveIds = objectives
        .filter((o) => o.id)
        .map((o) => o.id);
      const objectivesToDelete = existingObjectiveIds.filter(
        (id) => !currentObjectiveIds.includes(id),
      );

      for (const objId of objectivesToDelete) {
        await fetch(`/dashboard/performance/api/objectives/${objId}`, {
          method: "DELETE",
        });
      }

      // Update or create objectives
      for (const objective of objectives) {
        if (!objective.code) continue;

        let objId = objective.id;

        if (objId) {
          // Update existing objective
          await fetch(`/dashboard/performance/api/objectives/${objId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: objective.code,
              description: "",
            }),
          });
        } else {
          // Create new objective
          const objResponse = await fetch(
            "/dashboard/performance/api/objectives",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: objective.code,
                description: "",
                goalId: goal.id,
              }),
            },
          );

          if (objResponse.ok) {
            const newObj = await objResponse.json();
            objId = newObj.id;
          }
        }

        if (!objId) continue;

        // Get existing initiatives for this objective
        const existingObj = goal.objectives.find((o) => o.id === objective.id);
        const existingInitiativeIds =
          existingObj?.initiatives?.map((i: any) => i.id) || [];
        const currentInitiativeIds = objective.initiatives
          .filter((i) => i.id)
          .map((i) => i.id);
        const initiativesToDelete = existingInitiativeIds.filter(
          (id: string) => !currentInitiativeIds.includes(id),
        );

        // Delete removed initiatives
        for (const initId of initiativesToDelete) {
          await fetch(`/dashboard/performance/api/initiatives/${initId}`, {
            method: "DELETE",
          });
        }

        // Update or create initiatives
        for (const initiative of objective.initiatives) {
          if (!initiative.initiative) continue;

          const initPayload = {
            number: initiative.number,
            title: initiative.initiative,
            description: initiative.measure,
            measure: initiative.measure,
            action: initiative.action,
            reportingPeriods: initiative.reportingPeriods,
            quarterDates: initiative.quarterDates,
            target: initiative.target,
            primaryResponsibility: initiative.primaryResponsibility,
            secondaryResponsibility: initiative.secondaryResponsibility,
            objectiveId: objId,
          };

          if (initiative.id) {
            // Update existing initiative
            await fetch(
              `/dashboard/performance/api/initiatives/${initiative.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initPayload),
              },
            );
          } else {
            // Create new initiative
            const initResponse = await fetch(
              "/dashboard/performance/api/initiatives",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initPayload),
              },
            );

            // Automatically create a task for the primary executive
            if (initResponse.ok && initiative.primaryResponsibility) {
              const newInit = await initResponse.json();

              // Get the latest quarter date as the due date
              const quarterDates = initiative.quarterDates || {};
              const latestQuarter = initiative.reportingPeriods?.sort().pop();
              const dueDate =
                latestQuarter && quarterDates[latestQuarter]
                  ? quarterDates[latestQuarter]
                  : null;

              await fetch("/dashboard/performance/api/targets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: initiative.initiative,
                  description: `${initiative.action || initiative.measure || ""}\n\nTarget: ${initiative.target || "N/A"}`,
                  dueDate: dueDate,
                  initiativeId: newInit.id,
                  assignedToId: initiative.primaryResponsibility,
                  isAdhoc: false,
                }),
              });
            }
          }
        }
      }

      // Reset and close
      setStep(1);
      setCurrentObjectiveIndex(0);
      setCurrentInitiativeIndex(0);
      onOpenChange(false);
      onSuccess();
      toast({ title: "Goal updated successfully!" });
    } catch (error) {
      console.error("Failed to update goal:", error);
      toast({
        title:
          "Failed to update goal: " +
          (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return goalData.goalNumber && goalData.title;
    if (step === 2) return objectives.some((obj) => obj.code);
    if (step === 3)
      return objectives.some((obj) =>
        obj.initiatives.some((init) => init.initiative),
      );
    return true;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>
            Step {step} of 3:{" "}
            {step === 1
              ? "Goal Details"
              : step === 2
                ? "Objectives"
                : "Initiatives"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Goal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-number">Goal Number *</Label>
                <Input
                  id="goal-number"
                  value={goalData.goalNumber}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Goal number cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-title">Goal Title *</Label>
                <div className="flex gap-2">
                  <Input
                    id="goal-title"
                    value={goalData.title}
                    onChange={(e) =>
                      setGoalData({ ...goalData, title: e.target.value })
                    }
                    placeholder="e.g., Digital Transformation 2025"
                    className="flex-1"
                  />
                  {existingGoalTitles.length > 0 && (
                    <Select
                      value={goalData.title}
                      onValueChange={(value) =>
                        setGoalData({ ...goalData, title: value })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Or select existing" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingGoalTitles.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title.length > 30
                              ? title.substring(0, 30) + "..."
                              : title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {existingGoalTitles.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Recent: {existingGoalTitles.slice(0, 3).join(", ")}
                    {existingGoalTitles.length > 3 && "..."}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-startDate">Start Date *</Label>
                  <Input
                    id="goal-startDate"
                    type="date"
                    value={goalData.startDate}
                    onChange={(e) =>
                      setGoalData({ ...goalData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-endDate">End Date *</Label>
                  <Input
                    id="goal-endDate"
                    type="date"
                    value={goalData.endDate}
                    onChange={(e) =>
                      setGoalData({ ...goalData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Objectives */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Objectives ({objectives.length})</Label>
                <Button type="button" size="sm" onClick={addObjective}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Objective
                </Button>
              </div>

              {objectives.map((obj, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 relative"
                >
                  {objectives.length > 1 && (
                    <div className="flex items-center justify-end mb-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeObjective(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Objective
                      </Button>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`obj-code-${index}`}>
                        Objective Number *
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`obj-code-${index}`}
                          placeholder="e.g., 1.1, 1.2"
                          value={obj.code}
                          onChange={(e) =>
                            updateObjective(index, "code", e.target.value)
                          }
                          className="w-[150px]"
                        />
                        {existingObjectiveCodes.length > 0 && (
                          <Select
                            value={obj.code}
                            onValueChange={(value) =>
                              updateObjective(index, "code", value)
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select existing" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingObjectiveCodes.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {existingObjectiveCodes.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Recent:{" "}
                          {existingObjectiveCodes.slice(0, 5).join(", ")}
                          {existingObjectiveCodes.length > 5 && "..."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Initiatives */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Label>Select Objective:</Label>
                <Select
                  value={currentObjectiveIndex.toString()}
                  onValueChange={(value) => {
                    setCurrentObjectiveIndex(parseInt(value));
                    setCurrentInitiativeIndex(0);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map((obj, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {obj.code || `Objective ${index + 1}`} -{" "}
                        {obj.title || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>
                  Initiatives ({currentObjective?.initiatives?.length || 0})
                </Label>
                <Button type="button" size="sm" onClick={addInitiative}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Initiative
                </Button>
              </div>

              {currentObjective?.initiatives?.map((init, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        removeInitiative(currentObjectiveIndex, index)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Initiative Number */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-number-${index}`}>
                      Initiative Number *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`init-number-${index}`}
                        placeholder="e.g., 1.1.1, 1.1.2"
                        value={init.number}
                        onChange={(e) =>
                          updateInitiative(
                            currentObjectiveIndex,
                            index,
                            "number",
                            e.target.value,
                          )
                        }
                        className="w-[150px]"
                      />
                      {existingInitiativeNumbers.length > 0 && (
                        <Select
                          value={init.number}
                          onValueChange={(value) =>
                            updateInitiative(
                              currentObjectiveIndex,
                              index,
                              "number",
                              value,
                            )
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select existing" />
                          </SelectTrigger>
                          <SelectContent>
                            {existingInitiativeNumbers.map((num) => (
                              <SelectItem key={num} value={num}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {existingInitiativeNumbers.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Recent:{" "}
                        {existingInitiativeNumbers.slice(0, 5).join(", ")}
                        {existingInitiativeNumbers.length > 5 && "..."}
                      </p>
                    )}
                  </div>

                  {/* Strategic Initiative */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-initiative-${index}`}>
                      Strategic Initiative *
                    </Label>
                    <textarea
                      id={`init-initiative-${index}`}
                      placeholder="Enter strategic initiative"
                      value={init.initiative}
                      onChange={(e) =>
                        updateInitiative(
                          currentObjectiveIndex,
                          index,
                          "initiative",
                          e.target.value,
                        )
                      }
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Measure */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-measure-${index}`}>Measure *</Label>
                    <textarea
                      id={`init-measure-${index}`}
                      placeholder="Enter measure"
                      value={init.measure}
                      onChange={(e) =>
                        updateInitiative(
                          currentObjectiveIndex,
                          index,
                          "measure",
                          e.target.value,
                        )
                      }
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Action */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-action-${index}`}>Action *</Label>
                    <textarea
                      id={`init-action-${index}`}
                      placeholder="Enter action"
                      value={init.action}
                      onChange={(e) =>
                        updateInitiative(
                          currentObjectiveIndex,
                          index,
                          "action",
                          e.target.value,
                        )
                      }
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Reporting Period (Quarter) - Multi-select */}
                  <div className="space-y-3">
                    <Label>Reporting Period * (Select one or more)</Label>
                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-md">
                      {[
                        {
                          value: "Q1",
                          label: "Quarter 1",
                          months: "[Apr-Jun]",
                        },
                        {
                          value: "Q2",
                          label: "Quarter 2",
                          months: "[Jul-Sep]",
                        },
                        {
                          value: "Q3",
                          label: "Quarter 3",
                          months: "[Oct-Dec]",
                        },
                        {
                          value: "Q4",
                          label: "Quarter 4",
                          months: "[Jan-Mar]",
                        },
                      ].map((quarter) => (
                        <div
                          key={quarter.value}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={`init-period-${index}-${quarter.value}`}
                            checked={init.reportingPeriods.includes(
                              quarter.value,
                            )}
                            onChange={(e) => {
                              const newPeriods = e.target.checked
                                ? [...init.reportingPeriods, quarter.value]
                                : init.reportingPeriods.filter(
                                    (p) => p !== quarter.value,
                                  );
                              updateInitiative(
                                currentObjectiveIndex,
                                index,
                                "reportingPeriods",
                                newPeriods,
                              );

                              // Remove date for unchecked quarter
                              if (!e.target.checked) {
                                const newDates = { ...init.quarterDates };
                                delete newDates[quarter.value];
                                updateInitiative(
                                  currentObjectiveIndex,
                                  index,
                                  "quarterDates",
                                  newDates,
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor={`init-period-${index}-${quarter.value}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {quarter.label}{" "}
                            <span className="text-gray-500">
                              {quarter.months}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Date inputs for selected quarters */}
                    {init.reportingPeriods.length > 0 && (
                      <div className="space-y-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <Label className="text-sm font-medium text-blue-900">
                          Enter completion date for each selected quarter:
                        </Label>
                        {init.reportingPeriods.sort().map((quarter) => (
                          <div
                            key={quarter}
                            className="flex items-center gap-3"
                          >
                            <Label className="text-sm w-24">
                              {quarter} Date:
                            </Label>
                            <Input
                              type="date"
                              value={init.quarterDates[quarter] || ""}
                              onChange={(e) => {
                                const newDates = {
                                  ...init.quarterDates,
                                  [quarter]: e.target.value,
                                };
                                updateInitiative(
                                  currentObjectiveIndex,
                                  index,
                                  "quarterDates",
                                  newDates,
                                );
                              }}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Target (Number of outputs) */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-target-${index}`}>
                      Target (Number of Outputs) *
                    </Label>
                    <Input
                      id={`init-target-${index}`}
                      type="number"
                      placeholder="Enter number of items to be delivered"
                      value={init.target}
                      onChange={(e) =>
                        updateInitiative(
                          currentObjectiveIndex,
                          index,
                          "target",
                          e.target.value,
                        )
                      }
                      min="0"
                    />
                  </div>

                  {/* Primary Responsibility */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-primary-${index}`}>
                      Primary Responsibility *
                    </Label>
                    <Select
                      value={init.primaryResponsibility}
                      onValueChange={(value) =>
                        updateInitiative(
                          currentObjectiveIndex,
                          index,
                          "primaryResponsibility",
                          value,
                        )
                      }
                    >
                      <SelectTrigger id={`init-primary-${index}`}>
                        <SelectValue placeholder="Select primary responsibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter((user) => user.role === "EXECUTIVE")
                          .length > 0 ? (
                          users
                            .filter((user) => user.role === "EXECUTIVE")
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} - Executive
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="no-executives" disabled>
                            No executives available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secondary Responsibility (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor={`init-secondary-${index}`}>
                      Secondary Responsibility (Optional)
                    </Label>
                    <Select
                      value={init.secondaryResponsibility || "NONE"}
                      onValueChange={(value) =>
                        updateInitiative(
                          currentObjectiveIndex,
                          index,
                          "secondaryResponsibility",
                          value === "NONE" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger id={`init-secondary-${index}`}>
                        <SelectValue placeholder="Select secondary responsibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {users
                          .filter((user) => user.role === "EXECUTIVE")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} - Executive
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Updating..." : "Update Goal"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
