export class CreateWorkflowInstanceDto {
  workflowDefinitionId: string = "";
  title: string = "";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  formData: any = {};
  metadata?: any;
}

export class TransitionWorkflowDto {
  action: "SUBMIT" | "APPROVE" | "REJECT" | "RETURN" = "SUBMIT";
  comment?: string;
}
