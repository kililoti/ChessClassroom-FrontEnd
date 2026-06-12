import { LiveKitProvider } from '@/contexts/LiveKitContext';
import WidgetVoz from '@/components/aula/WidgetVoz';

export default function ClaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiveKitProvider>
      {children}
      <WidgetVoz />
    </LiveKitProvider>
  );
}