import { createStandaloneToast } from "@chakra-ui/react";
import { theme } from "Styles";

const toast = createStandaloneToast({ theme: theme });

interface IToastProps {
  title: string;
  duration?: number;
  message?: string;
}

export const ToastService = {
  showSuccessTaost: ({ title, message }: IToastProps) => {
    toast.toast({
      title: title,
      description: message,
      variant: "customSuccess",
      position: "top-right",
      isClosable: true,
      status: "success",
    });
  },
  showErrorToast: ({ title, message }: IToastProps) => {
    toast.toast({
      title: title,
      description: message,
      variant: "solid",
      position: "top-right",
      status: "error",
      isClosable: true,
    });
  },
  showLoadingToast: ({ title, message, duration }: IToastProps) => {
    toast.toast({
      title: title,
      description: message,
      duration: duration ?? 3000,
      position: "top-right",
      variant: "solid",
      status: "loading",
    });
  },
  closeAllToast: () => {
    toast.toast.closeAll();
  },
  showInfoToast: ({ title, message }: IToastProps) => {
    toast.toast({
      title: title,
      description: message,
      duration: 3000,
      position: "top-right",
      variant: "subtle",
      status: "info",
    });
  },
};
