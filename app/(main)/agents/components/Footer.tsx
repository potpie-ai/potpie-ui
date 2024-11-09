import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";
import { Loader } from "lucide-react";
import { toast } from "sonner";

const Footer: React.FC<{
  submitForm: () => void;
  form: any;
  update: boolean;
  primaryBtnLoading?: boolean;
  redeploy?: boolean;
  statusLoading: boolean;
}> = ({
  submitForm,
  form,
  update,
  primaryBtnLoading = false,
  redeploy = false,
  statusLoading,
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
      let jsonValid = true;
      tasks.forEach(
        (task: { expected_output: { output: string } }, index: any) => {
          if (!isValidJSON(task.expected_output.output)) {
            jsonValid = false;
            form.setError(`tasks.${index}.expected_output.output`, {
              type: "manual",
              message: "Expected output must be valid JSON",
            });
          } else {
            form.clearErrors(`tasks.${index}.expected_output.output`);
          }
        }
      );

      isValid = isValid && jsonValid;
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
              disabled={primaryBtnLoading || (isLastStep && statusLoading)}
            >
              {primaryBtnLoading || (isLastStep && statusLoading) ? (
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  {isLastStep
                    ? redeploy
                      ? "Update and Redeploy"
                      : update
                      ? "Update"
                      : "Create"
                    : isOptionalStep
                    ? "Skip"
                    : "Next"}
                </div>
              ) : isLastStep ? (
                redeploy
                  ? "Update and Redeploy"
                  : update
                  ? "Update"
                  : "Create"
              ) : isOptionalStep ? (
                "Skip"
              ) : (
                "Next"
              )}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default Footer;
