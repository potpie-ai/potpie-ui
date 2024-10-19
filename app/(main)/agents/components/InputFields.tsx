import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomAgentsFormValues } from "@/lib/Schema";
import { InfoIcon } from "lucide-react";

interface InputFieldProps {
  form: any;
  name: string;
  placeholder: string;
  label: string;
}

const InputField: React.FC<InputFieldProps> = ({
  form,
  name,
  placeholder,
  label,
}) => (
  <FormField
    control={form.control}
    name={name as keyof CustomAgentsFormValues}
    render={({ field }) => (
      <FormItem>
        <FormLabel className="flex items-center gap-3">
          <p>{label}</p>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="size-5" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Description about the Input</p>
            </TooltipContent>
          </Tooltip>
        </FormLabel>
        <FormControl>
          <Textarea
            placeholder={placeholder}
            {...field}
            className="resize-y max-h-44"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export default InputField;
