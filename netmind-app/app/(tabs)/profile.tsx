import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, Screen, SectionTitle } from '@/components/netmind-ui';
import { useNetmindTheme } from '@/contexts/netmind-theme';
import { parseDateInput, toLocalDateKey } from '@/lib/dateKeys';
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
  birthdate: string;
  location: string;
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return toLocalDateKey(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = parseDateInput(value);
  if (!date) return value;

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

const positionOptions = ['OH', 'OPP', 'MB', 'S', 'L'];
const toLocalDateInput = (date: Date) => {
  return toLocalDateKey(date);
};

const calculateAge = (value?: string | null) => {
  if (!value) return null;
  const birthdate = fromDateInput(value);
  if (!birthdate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const birthdayPassedThisYear = today.getMonth() > birthdate.getMonth()
    || (today.getMonth() === birthdate.getMonth() && today.getDate() >= birthdate.getDate());

  if (!birthdayPassedThisYear) age -= 1;
  return age >= 0 ? age : null;
};

const fromDateInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function ProfileScreen() {
  const { colors, isDark } = useNetmindTheme();
  const [profile, setProfile] = useState<NetmindUser | null>(null);
  const [teamName, setTeamName] = useState('No team linked yet');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [birthdatePickerOpen, setBirthdatePickerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    position: '',
    jersey_number: '',
    birthdate: '',
    location: '',
  });
  const profileImage = getProfilePictureUrl(profile);
  const jerseyLabel = String(profile?.jersey_number || '').trim() || playerInitials(profile?.name);
  const birthdatePickerValue = useMemo(() => {
    const date = form.birthdate ? fromDateInput(form.birthdate) || new Date() : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }, [form.birthdate]);

  const details = useMemo(() => [
    { label: 'Gmail', value: profile?.email || '-', icon: 'mail' },
    { label: 'Role', value: profile?.role || '-', icon: 'verified-user' },
    { label: 'Position', value: profile?.position || '-', icon: 'sports-volleyball' },
    { label: 'Jersey No.', value: profile?.jersey_number || '-', icon: 'tag' },
    { label: 'Age', value: calculateAge(profile?.birthdate) ?? profile?.age ?? '-', icon: 'cake' },
    { label: 'Birthdate', value: formatDate(profile?.birthdate), icon: 'event' },
    { label: 'Location', value: profile?.location || '-', icon: 'place' },
    { label: 'Joined', value: formatDate(profile?.created_at), icon: 'schedule' },
  ], [profile]);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const saved = await AsyncStorage.getItem('netmind_user');
      const savedUser = saved ? JSON.parse(saved) as NetmindUser : null;
      const freshProfile = savedUser?.id
        ? await getResource<NetmindUser>('users', savedUser.id).catch(() => savedUser)
        : null;

      setProfile(freshProfile);
      setTeamName('No team linked yet');
      if (freshProfile) {
        await AsyncStorage.setItem('netmind_user', JSON.stringify(freshProfile));
        setForm({
          name: freshProfile.name || '',
          position: freshProfile.position || '',
          jersey_number: String(freshProfile.jersey_number || ''),
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
          if (team?.team_name) setTeamName(team.team_name);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openBirthdatePicker = () => {
    setBirthdatePickerOpen(true);
  };

  const refreshProfile = async (updated: NetmindUser) => {
    setProfile(updated);
    setForm({
      name: updated.name || '',
      position: updated.position || '',
      jersey_number: String(updated.jersey_number || ''),
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
        position: profile.position || null,
        jersey_number: form.jersey_number || null,
        age: calculateAge(form.birthdate),
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
    <Screen
      onRefresh={() => loadProfile('refresh')}
      refreshing={refreshing}
      title="Profile"
      subtitle="Player information, identity, and account details.">
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoider}>
            <View style={[styles.editModal, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.line }]} />
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBlock}>
                  <Text style={[styles.modalTitle, { color: colors.ink }]}>Edit Profile</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Update your player information.</Text>
                </View>
                <Pressable onPress={() => setEditOpen(false)} style={styles.closeButton}>
                  <MaterialIcons name="close" size={22} color={colors.muted} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <EditField label="Name" value={form.name} onChangeText={(value) => updateForm('name', value)} />
                <EditField editable={false} label="Gmail" value={profile?.email || ''} />
                <PositionPicker value={form.position} />
                <EditField keyboardType="number-pad" label="Jersey" value={form.jersey_number} onChangeText={(value) => updateForm('jersey_number', value)} />
                <DateField
                  onOpen={openBirthdatePicker}
                  value={form.birthdate}
                />
                <ReadOnlyField label="Age" value={String(calculateAge(form.birthdate) ?? '-')} />
                <EditField label="Location" value={form.location} onChangeText={(value) => updateForm('location', value)} />
              </ScrollView>

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
          </KeyboardAvoidingView>
          {birthdatePickerOpen ? (
            <View style={styles.datePickerLayer}>
              <Pressable
                accessibilityLabel="Close birthdate picker"
                onPress={() => setBirthdatePickerOpen(false)}
                style={styles.datePickerDismissArea}
              />
              <View
                style={[
                  styles.datePickerCard,
                  {
                    backgroundColor: isDark ? colors.surface : '#ffffff',
                    borderColor: colors.court,
                    shadowOpacity: isDark ? 0.42 : 0.2,
                  },
                ]}>
                <View style={styles.datePickerHeader}>
                  <Text style={[styles.datePickerTitle, { color: colors.ink }]}>Birthdate</Text>
                  <Pressable onPress={() => setBirthdatePickerOpen(false)} style={styles.closeButton}>
                    <MaterialIcons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.rollerWrap,
                    {
                      backgroundColor: isDark ? colors.wash : '#f8fcfd',
                      borderColor: colors.line,
                    },
                  ]}>
                  <DateTimePicker
                    accentColor={colors.court}
                    display="spinner"
                    maximumDate={new Date()}
                    mode="date"
                    onChange={(_, selectedDate) => {
                      if (selectedDate) updateForm('birthdate', toLocalDateInput(selectedDate));
                    }}
                    style={styles.rollerPicker}
                    textColor={isDark ? '#e7f8fb' : '#10252c'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    value={birthdatePickerValue}
                  />
                </View>
                <Text style={[styles.datePickerHelper, { color: colors.muted }]}>
                  Scroll the wheels to choose your birthdate.
                </Text>
                <View style={styles.datePickerActions}>
                  <Pressable
                    onPress={() => setBirthdatePickerOpen(false)}
                    style={[styles.datePickerButton, { borderColor: colors.line }]}>
                    <Text style={[styles.secondaryButtonText, { color: colors.court }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setBirthdatePickerOpen(false)}
                    style={[styles.datePickerButton, styles.datePickerPrimary, { backgroundColor: colors.court }]}>
                    <Text style={styles.primaryButtonText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
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

function DateField({
  value,
  onOpen,
}: {
  value: string;
  onOpen: () => void;
}) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>Birthdate</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={[
          styles.dateInput,
          {
            backgroundColor: colors.wash,
            borderColor: colors.line,
          },
        ]}>
        <Text style={[styles.dateInputText, { color: value ? colors.ink : colors.muted }]}>
          {value || 'Select birthdate'}
        </Text>
        <MaterialIcons name="calendar-month" size={20} color={colors.court} />
      </Pressable>
    </View>
  );
}

function PositionPicker({
  value,
}: {
  value: string;
}) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>Position</Text>
      <View style={styles.positionGrid}>
        {positionOptions.map((position) => {
          const active = value === position;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled
              key={position}
              style={[
                styles.positionOption,
                {
                  backgroundColor: active ? colors.court : colors.courtSoft,
                  borderColor: active ? colors.court : colors.line,
                  opacity: active ? 1 : 0.58,
                },
              ]}>
              <Text style={[styles.positionOptionText, { color: active ? '#ffffff' : colors.ink }]}>
                {position}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.readOnlyHint, { color: colors.muted }]}>
        Position is assigned by your coach or trainer.
      </Text>
    </View>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const { colors } = useNetmindTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>{label}</Text>
      <View style={[styles.readOnlyInput, { backgroundColor: colors.courtSoft, borderColor: colors.line }]}>
        <Text style={[styles.readOnlyInputText, { color: colors.ink }]}>{value}</Text>
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
  keyboardAvoider: {
    justifyContent: 'flex-end',
  },
  modalBackdropDark: {
    backgroundColor: 'rgba(3, 18, 25, 0.72)',
  },
  modalBackdropLight: {
    backgroundColor: 'rgba(16, 37, 44, 0.28)',
  },
  datePickerLayer: {
    alignItems: 'center',
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 22,
    zIndex: 20,
  },
  datePickerDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  datePickerCard: {
    borderRadius: 8,
    borderWidth: 2,
    elevation: 18,
    maxWidth: 360,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    width: '100%',
  },
  datePickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  rollerWrap: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rollerPicker: {
    alignSelf: 'center',
    height: 184,
    width: '100%',
  },
  datePickerHelper: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  datePickerButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  datePickerPrimary: {
    borderWidth: 0,
  },
  editModal: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    gap: 16,
    maxHeight: '88%',
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
  modalTitleBlock: {
    flex: 1,
    paddingRight: 8,
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
    paddingBottom: 2,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionOption: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    minWidth: 54,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  positionOptionText: {
    fontSize: 14,
    fontWeight: '900',
  },
  readOnlyHint: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  readOnlyInput: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  readOnlyInputText: {
    fontSize: 15,
    fontWeight: '900',
  },
  dateInput: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  dateInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
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
