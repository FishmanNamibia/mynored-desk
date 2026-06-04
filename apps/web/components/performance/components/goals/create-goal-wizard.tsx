'use client'

import { toast } from "@/hooks/use-toast";

import { useState, useEffect } from "react";
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
  title: string;
  description: string;
  dueDate: string;
  assignedToId: string;
}

interface Initiative {
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
  code: string;
  title: string;
  description: string;
  initiatives: Initiative[];
}

interface GoalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: User[];
}

export function CreateGoalWizard({
  open,
  onOpenChange,
  onSuccess,
  users,
}: GoalWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchExistingData();
    }
  }, [open]);

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

  const addTarget = () => {
    const newObjectives = [...objectives];
    if (
      !newObjectives[currentObjectiveIndex].initiatives[currentInitiativeIndex]
        .targets
    ) {
      newObjectives[currentObjectiveIndex].initiatives[
        currentInitiativeIndex
      ].targets = [];
    }
    newObjectives[currentObjectiveIndex].initiatives[
      currentInitiativeIndex
    ].targets.push({
      title: "",
      description: "",
      dueDate: "",
      assignedToId: "",
    });
    setObjectives(newObjectives);
  };

  const removeTarget = (
    objIndex: number,
    initIndex: number,
    targetIndex: number,
  ) => {
    const newObjectives = [...objectives];
    newObjectives[objIndex].initiatives[initIndex].targets = newObjectives[
      objIndex
    ].initiatives[initIndex].targets.filter((_, i) => i !== targetIndex);
    setObjectives(newObjectives);
  };

  const updateTarget = (
    objIndex: number,
    initIndex: number,
    targetIndex: number,
    field: string,
    value: string,
  ) => {
    const newObjectives = [...objectives];
    newObjectives[objIndex].initiatives[initIndex].targets[targetIndex] = {
      ...newObjectives[objIndex].initiatives[initIndex].targets[targetIndex],
      [field]: value,
    };
    setObjectives(newObjectives);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create goal with default dates (current year)
      const currentYear = new Date().getFullYear();
      const goalPayload = {
        ...goalData,
        startDate: goalData.startDate || `${currentYear}-01-01`,
        endDate: goalData.endDate || `${currentYear}-12-31`,
      };

      console.log("Creating goal with payload:", goalPayload);

      const goalResponse = await fetch("/dashboard/performance/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalPayload),
      });

      if (!goalResponse.ok) {
        const errorData = await goalResponse.json();
        console.error("Goal creation failed:", errorData);
        throw new Error(`Failed to create goal: ${JSON.stringify(errorData)}`);
      }
      const goal = await goalResponse.json();
      console.log("Goal created successfully:", goal);

      // Create objectives with initiatives and targets
      for (const objective of objectives) {
        if (!objective.code) continue;

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

        if (!objResponse.ok) continue;
        const obj = await objResponse.json();

        // Create initiatives
        for (const initiative of objective.initiatives) {
          if (!initiative.initiative) continue;

          const initResponse = await fetch(
            "/dashboard/performance/api/initiatives",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
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
                objectiveId: obj.id,
              }),
            },
          );

          if (!initResponse.ok) continue;
          const init = await initResponse.json();

          // Automatically create a task for the primary executive
          if (initiative.primaryResponsibility) {
            // Get the latest quarter date as the due date
            const quarterDates = initiative.quarterDates || {};
            const latestQuarter = initiative.reportingPeriods?.sort().pop();
            const dueDate =
              latestQuarter && quarterDates[latestQuarter]
                ? quarterDates[latestQuarter]
                : null;

            const taskPayload = {
              title: initiative.initiative,
              description: `${initiative.action || initiative.measure || ""}\n\nTarget: ${initiative.target || "N/A"}`,
              dueDate: dueDate,
              initiativeId: init.id,
              assignedToId: initiative.primaryResponsibility,
              isAdhoc: false,
            };

            console.log("Creating task for executive:", taskPayload);

            const taskResponse = await fetch(
              "/dashboard/performance/api/targets",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(taskPayload),
              },
            );

            if (taskResponse.ok) {
              const createdTask = await taskResponse.json();
              console.log("Task created successfully:", createdTask);
            } else {
              const error = await taskResponse.json();
              console.error("Failed to create task:", error);
            }
          }

          // Create additional targets if any
          for (const target of initiative.targets) {
            if (!target.title || !target.assignedToId) continue;

            await fetch("/dashboard/performance/api/targets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: target.title,
                description: target.description,
                dueDate: target.dueDate,
                initiativeId: init.id,
                assignedToId: target.assignedToId,
              }),
            });
          }
        }
      }

      // Reset form
      setGoalData({
        goalNumber: "",
        title: "",
        description: "",
        startDate: "",
        endDate: "",
      });
      setObjectives([
        { code: "", title: "", description: "", initiatives: [] },
      ]);
      setStep(1);
      setCurrentObjectiveIndex(0);
      setCurrentInitiativeIndex(0);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast({
        title: "Failed to create goal and assignments",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
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
                <div className="flex gap-2">
                  <Input
                    id="goal-number"
                    value={goalData.goalNumber}
                    onChange={(e) =>
                      setGoalData({ ...goalData, goalNumber: e.target.value })
                    }
                    placeholder="Enter goal number (e.g., 1, 2, 3)"
                    className="flex-1"
                  />
                  {existingGoalNumbers.length > 0 && (
                    <Select
                      value={goalData.goalNumber}
                      onValueChange={(value) =>
                        setGoalData({ ...goalData, goalNumber: value })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Or select existing" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingGoalNumbers.map((num) => (
                          <SelectItem key={num} value={num}>
                            Goal {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {existingGoalNumbers.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Existing goals: {existingGoalNumbers.join(", ")}
                  </p>
                )}
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
                {submitting ? "Creating..." : "Create Goal"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
