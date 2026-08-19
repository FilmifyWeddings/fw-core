export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  action?: string;
}

export interface UpcomingEvent {
  id: string;
  couple: string;
  type: string;
  date: string;
  image: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: 'lead' | 'quote' | 'payment' | 'shoot' | 'album';
  badgeColor: string;
}

export interface FloatingNotification {
  id: string;
  title: string;
  subtitle: string;
  tag?: string;
  amount?: string;
  time: string;
  icon: string;
  iconBg: string;
  offset: number;
  delay: number;
}
