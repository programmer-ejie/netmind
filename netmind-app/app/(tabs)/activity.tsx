import { Card, ListRow, Screen, SectionTitle } from '@/components/netmind-ui';
import { pendingTasks, recentActivity } from '@/constants/netmind';

export default function ActivityScreen() {
  return (
    <Screen title="Activity" subtitle="A combined timeline of coach updates, logs, and task reminders.">
      <SectionTitle>Timeline</SectionTitle>
      <Card>
        {recentActivity.map((item) => (
          <ListRow
            detail={item.detail}
            icon="history"
            key={item.title}
            meta={item.time}
            title={item.title}
          />
        ))}
      </Card>

      <SectionTitle>Needs attention</SectionTitle>
      <Card>
        {pendingTasks.map((item) => (
          <ListRow detail={`Due ${item.due}`} icon="flag" key={item.task} meta={item.status} title={item.task} />
        ))}
      </Card>
    </Screen>
  );
}
