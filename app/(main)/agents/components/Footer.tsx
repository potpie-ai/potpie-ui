import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";
import { Loader } from "lucide-react";
import { toast } from "sonner";

const Footer: React.FC<{
  submitForm: () => void;
  form: any;
  update: boolean;
  primaryBtnLoading?: boolean;
}> = ({
  submitForm,
  form,
  update,
  primaryBtnLoading = false,
}) => {
  const {
    nextStep,
    prevStep,
    resetSteps,
    isDisabledStep,
    hasCompletedAllSteps,
    isLastStep,
    isOptionalStep,
    currentStep,
  } = useStepper();

  const isValidJSON = (text: string) => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  };

  const validateCurrentStep = async () => {
    let isValid = false;

    if (currentStep.id === "0") {
      isValid = await form.trigger("system_prompt");
    } else if (currentStep.id === "1") {
      isValid = await form.trigger(["role", "goal", "backstory"]);
    } else if (currentStep.id === "2") {
      const taskCount = form.getValues("tasks").length;
      isValid = (await form.trigger("tasks")) && taskCount > 0;

      const tasks = form.getValues("tasks");
      let fieldsValid = true;
      tasks.forEach((task: any, index: number) => {
        if (task.expected_output && !isValidJSON(task.expected_output)) {
          fieldsValid = false;
          form.setError(`tasks.${index}.expected_output`, {
            type: "manual",
            message: "Invalid JSON format",
          });
        } else {
          form.clearErrors(`tasks.${index}.expected_output`);
        }
      });

      isValid = isValid && fieldsValid;
    } else {
      isValid = true;
    }

    return isValid;
  };

  const handleNextStep = async () => {
    if (await validateCurrentStep()) {
      if (isLastStep) {
        const allValid = await validateCurrentStep();
        if (!allValid) {
          return;
        }
        submitForm();
      } else {
        nextStep();
      }
    }
  };

  return (
    <>
      {hasCompletedAllSteps && (
        <div className="h-40 flex items-center justify-center my-2 border bg-secondary text-primary rounded-md">
          <h1 className="text-xl">Woohoo! All steps completed! 🎉</h1>
        </div>
      )}
      <div className="w-full flex justify-end gap-2">
        {hasCompletedAllSteps ? (
          <Button size="sm" onClick={resetSteps}>
            Reset
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={isDisabledStep}
              onClick={prevStep}
              size="sm"
              variant="secondary"
            >
              Prev
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleNextStep}
              disabled={primaryBtnLoading}
            >
              {primaryBtnLoading ? (
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  {isLastStep ? (update ? "Update" : "Create") : "Next"}
                </div>
              ) : (
                isLastStep ? (update ? "Update" : "Create") : "Next"
              )}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default Footer;
