export interface AlarmsListWidgetConfig {
  device: {
    id: string;
  };
  status: string[];
  severity: string[];
  showSubassets: boolean;
  order: string;
}
