import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, Screen, SectionTitle } from '@/components/netmind-ui';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import {
  getProfilePictureUrl,
  getResource,
  listResource,
  type NetmindUser,
  type Team,
  type TeamMember,
  updateResource,
  uploadProfilePicture,
} from '@/lib/api';

type ProfileForm = {
  name: string;
  position: string;
  jersey_number: string;
  age: string;
  birthdate: string;
  location: string;
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const playerInitials = (name?: string) => (
  name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'NM'
);

const getImageType = (uri: string) => {
  const extension = uri.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
};

export default function ProfileScreen() {
  const { colors, isDark } = useNetmindTheme();
  const [profile, setProfile] = useState<NetmindUser | null>(null);
  const [teamName, setTeamName] = useState('No team linked yet');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    position: '',
    jersey_number: '',
    age: '',
    birthdate: '',
    location: '',
  });
  const profileImage = getProfilePictureUrl(profile);
  const jerseyLabel = String(profile?.jersey_number || '').trim() || playerInitials(profile?.name);

  const details = useMemo(() => [
    { label: 'Gmail', value: profile?.email || '-', icon: 'mail' },
    { label: 'Role', value: profile?.role || '-', icon: 'verified-user' },
    { label: 'Position', value: profile?.position || '-', icon: 'sports-volleyball' },
    { label: 'Jersey No.', value: profile?.jersey_number || '-', icon: 'tag' },
    { label: 'Age', value: profile?.age || '-', icon: 'cake' },
    { label: 'Birthdate', value: formatDate(profile?.birthdate), icon: 'event' },
    { label: 'Location', value: profile?.location || '-', icon: 'place' },
    { label: 'Joined', value: formatDate(profile?.created_at), icon: 'schedule' },
  ], [profile]);

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem('netmind_user');
        const savedUser = saved ? JSON.parse(saved) as NetmindUser : null;
        const freshProfile = savedUser?.id
          ? await getResource<NetmindUser>('users', savedUser.id).catch(() => savedUser)
          : null;

        if (!alive) return;

        setProfile(freshProfile);
        if (freshProfile) {
          await AsyncStorage.setItem('netmind_user', JSON.stringify(freshProfile));
          setForm({
            name: freshProfile.name || '',
            position: freshProfile.position || '',
            jersey_number: String(freshProfile.jersey_number || ''),
            age: String(freshProfile.age || ''),
            birthdate: toDateInput(freshProfile.birthdate),
            location: freshProfile.location || '',
          });
        }

        if (freshProfile?.id) {
          const links = await listResource<TeamMember>('team-members', {
            player_id: freshProfile.id,
            is_active: 1,
            limit: 1,
          }).catch(() => ({ data: [] }));
          const teamId = links.data[0]?.team_id;

          if (teamId) {
            const team = await getResource<Team>('teams', teamId).catch(() => null);
            if (alive && team?.team_name) setTeamName(team.team_name);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      alive = false;
    };
  }, []);

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const refreshProfile = async (updated: NetmindUser) => {
    setProfile(updated);
    setForm({
      name: updated.name || '',
      position: updated.position || '',
      jersey_number: String(updated.jersey_number || ''),
      age: String(updated.age || ''),
      birthdate: toDateInput(updated.birthdate),
      location: updated.location || '',
    });
    await AsyncStorage.setItem('netmind_user', JSON.stringify(updated));
  };

  const saveProfile = async () => {
    if (!profile?.id) return;

    setSaving(true);
    setMessage('');

    try {
      const updated = await updateResource<NetmindUser>('users', profile.id, {
        name: form.name,
        email: profile.email,
        role: profile.role || 'player',
        position: form.position || null,
        jersey_number: form.jersey_number || null,
        age: form.age || null,
        birthdate: form.birthdate || null,
        location: form.location || null,
        is_active: profile.is_active ?? true,
      });

      await refreshProfile(updated);
      setEditOpen(false);
      setMessage('Profile details saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const changeProfilePicture = async () => {
    if (!profile?.id || uploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Allow photo access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const imageName = asset.fileName || `profile-${profile.id}.jpg`;

    setUploading(true);
    setMessage('');

    try {
      const payload = await uploadProfilePicture(profile.id, {
        uri,
        name: imageName,
        type: asset.mimeType || getImageType(uri),
      });
      await refreshProfile(payload.user);
      setMessage('Profile picture updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen title="Profile" subtitle="Player information, identity, and account details.">
      {message ? (
        <View style={[styles.notice, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
          <Text style={[styles.noticeText, { color: colors.ink }]}>{message}</Text>
        </View>
      ) : null}

      <Card style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.court }]}>{jerseyLabel}</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
            disabled={uploading || !profile?.id}
            onPress={changeProfilePicture}
            style={[styles.photoButton, { backgroundColor: colors.court, borderColor: colors.surface }]}>
            {uploading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>

        <View style={styles.profileText}>
          <Text style={[styles.name, { color: colors.ink }]}>{profile?.name || 'Player Profile'}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {profile?.position || 'Position not set'} {profile?.jersey_number ? `- #${profile.jersey_number}` : ''}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{teamName}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          disabled={!profile}
          onPress={() => setEditOpen(true)}
          style={[styles.editButton, { backgroundColor: colors.wash, borderColor: colors.line }]}>
          <MaterialIcons name="edit" size={20} color={colors.court} />
        </Pressable>
      </Card>

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.court} />
          <Text style={[styles.meta, { color: colors.muted }]}>Loading profile...</Text>
        </Card>
      ) : null}

      <SectionTitle>Personal details</SectionTitle>
      <Card style={styles.details}>
        {details.map((item) => (
          <Detail key={item.label} icon={item.icon as keyof typeof MaterialIcons.glyphMap} label={item.label} value={String(item.value)} />
        ))}
      </Card>

      <Modal
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
        transparent
        visible={editOpen}>
        <View style={[styles.modalBackdrop, isDark ? styles.modalBackdropDark : styles.modalBackdropLight]}>
          <View style={[styles.editModal, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.line }]} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.ink }]}>Edit Profile</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Update your player information.</Text>
              </View>
              <Pressable onPress={() => setEditOpen(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <EditField label="Name" value={form.name} onChangeText={(value) => updateForm('name', value)} />
              <EditField editable={false} label="Gmail" value={profile?.email || ''} />
              <View style={styles.formGrid}>
                <EditField label="Position" value={form.position} onChangeText={(value) => updateForm('position', value)} />
                <EditField keyboardType="number-pad" label="Jersey" value={form.jersey_number} onChangeText={(value) => updateForm('jersey_number', value)} />
              </View>
              <View style={styles.formGrid}>
                <EditField keyboardType="number-pad" label="Age" value={form.age} onChangeText={(value) => updateForm('age', value)} />
                <EditField label="Birthdate" placeholder="YYYY-MM-DD" value={form.birthdate} onChangeText={(value) => updateForm('birthdate', value)} />
              </View>
              <EditField label="Location" value={form.location} onChangeText={(value) => updateForm('location', value)} />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditOpen(false)}
                style={[styles.secondaryButton, { borderColor: colors.line }]}>
                <Text style={[styles.secondaryButtonText, { color: colors.court }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={saveProfile}
                style={[styles.primaryButton, { backgroundColor: colors.court }, saving ? styles.disabled : null]}>
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: colors.courtSoft }]}>
        <MaterialIcons name={icon} size={18} color={colors.court} />
      </View>
      <View style={styles.detailBody}>
        <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

function EditField({
  label,
  editable = true,
  ...props
}: {
  label: string;
  editable?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>{label}</Text>
      <TextInput
        {...props}
        editable={editable}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            backgroundColor: editable ? colors.wash : colors.courtSoft,
            borderColor: colors.line,
            color: colors.ink,
          },
          props.style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 82,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 82,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '900',
  },
  photoButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    bottom: -4,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 34,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
  },
  meta: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  editButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  loadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  detailIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  detailBody: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropDark: {
    backgroundColor: 'rgba(3, 18, 25, 0.72)',
  },
  modalBackdropLight: {
    backgroundColor: 'rgba(16, 37, 44, 0.28)',
  },
  editModal: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  modalHandle: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    width: 44,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  form: {
    gap: 12,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.68,
  },
});
