import toast from 'react-hot-toast';

export const notify = {
  success(message: string) {
    toast.success(message);
  },
  error(message: string) {
    toast.error(message);
  },
  warning(message: string) {
    toast(message, {
      icon: '!',
      className:
        'border border-amber-200 bg-white text-sm font-medium text-gray-900 shadow-lg dark:border-amber-800 dark:bg-gray-800 dark:text-white',
    });
  },
};
