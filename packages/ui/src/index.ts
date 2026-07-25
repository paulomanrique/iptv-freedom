// shadcn-style UI primitives + design-system helpers, built on the t3code tokens.
export { cn } from "./lib/cn";
export { useTheme, type Theme } from "./lib/use-theme";

export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input, type InputProps } from "./components/input";
export { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/card";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export { Progress, type ProgressProps } from "./components/progress";
export { Switch, type SwitchProps } from "./components/switch";
export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  type DialogProps,
} from "./components/dialog";
export { Tooltip, type TooltipProps } from "./components/tooltip";
export { Select, type SelectProps } from "./components/select";
