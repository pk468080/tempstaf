import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'

import { supabase } from '../lib/supabase'

type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'passport_photo'
  | 'address_proof'
  | 'police_verification'
  | 'bank_account'

type WorkerDocument = {
  id: string
  document_type: DocumentType
  file_path: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
}

type Props = {
  onContinue: () => void
  onBack?: () => void
}

const DOCUMENTS: Array<{
  type: DocumentType
  title: string
  description: string
  photoOnly?: boolean
}> = [
  {
    type: 'passport_photo',
    title: 'Profile / Passport Photo',
    description: 'Recent clear photo of your face. JPG or PNG.',
    photoOnly: true,
  },
  {
    type: 'aadhaar',
    title: 'Aadhaar',
    description: 'Upload a clear Aadhaar document. JPG, PNG or PDF.',
  },
  {
    type: 'pan',
    title: 'PAN',
    description: 'Upload a clear PAN card. JPG, PNG or PDF.',
  },
  {
    type: 'address_proof',
    title: 'Address Proof',
    description: 'Upload an accepted address-proof document.',
  },
  {
    type: 'police_verification',
    title: 'Police Verification',
    description: 'Upload your police verification document.',
  },
  {
    type: 'bank_account',
    title: 'Bank Account / Cancelled Cheque',
    description: 'Upload a clear bank proof document.',
  },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
]

export default function WorkerDocumentsScreen({
  onContinue,
  onBack,
}: Props) {
  const [documents, setDocuments] = useState<WorkerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<DocumentType | null>(null)

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from('worker_documents')
      .select(
        'id, document_type, file_path, file_name, mime_type, file_size, status, rejection_reason'
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    setDocuments((data ?? []) as WorkerDocument[])
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadDocuments()
      } catch (error: any) {
        console.error(
          '[TempStaff Worker] Failed to load documents:',
          error
        )
        Alert.alert(
          'Unable to load documents',
          error?.message || 'Please try again.'
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const latestByType = useMemo(() => {
    const map = new Map<DocumentType, WorkerDocument>()

    for (const document of documents) {
      if (!map.has(document.document_type)) {
        map.set(document.document_type, document)
      }
    }

    return map
  }, [documents])

  const requiredComplete = DOCUMENTS.every(document => {
    const item = latestByType.get(document.type)
    return Boolean(item && item.status !== 'rejected')
  })

  const pickDocument = async (
    type: DocumentType,
    photoOnly = false
  ) => {
    if (uploading) return

    try {
      setUploading(type)

      let asset: {
        uri: string
        name: string
        mimeType: string
        size: number
      } | null = null

      if (photoOnly) {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync()

        if (!permission.granted) {
          Alert.alert(
            'Photo permission required',
            'Allow photo-library access to select your profile photo.'
          )
          return
        }

        const result =
          await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          })

        if (result.canceled || !result.assets[0]) {
          return
        }

        const selected = result.assets[0]

        asset = {
          uri: selected.uri,
          name: selected.fileName || `passport-photo-${Date.now()}.jpg`,
          mimeType: selected.mimeType || 'image/jpeg',
          size: selected.fileSize || 0,
        }
      } else {
        const result =
          await DocumentPicker.getDocumentAsync({
            type: ALLOWED_MIME_TYPES,
            copyToCacheDirectory: true,
            multiple: false,
          })

        if (result.canceled || !result.assets[0]) {
          return
        }

        const selected = result.assets[0]

        asset = {
          uri: selected.uri,
          name: selected.name || `document-${Date.now()}`,
          mimeType: selected.mimeType || 'application/pdf',
          size: selected.size || 0,
        }
      }

      if (!ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
        Alert.alert(
          'Unsupported file',
          'Please choose a JPG, PNG or PDF file.'
        )
        return
      }

      if (asset.size > MAX_FILE_SIZE) {
        Alert.alert(
          'File too large',
          'Each document must be 10 MB or smaller.'
        )
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('Worker is not authenticated.')

      const extension =
        asset.name.includes('.') 
          ? asset.name.split('.').pop()?.toLowerCase()
          : asset.mimeType === 'application/pdf'
            ? 'pdf'
            : 'jpg'

      const path =
        `${user.id}/${type}/${Date.now()}.${extension || 'bin'}`

      const fileResponse = await fetch(asset.uri)
      const fileBody = await fileResponse.arrayBuffer()

      const { error: uploadError } =
        await supabase.storage
          .from('worker-documents')
          .upload(path, fileBody, {
            contentType: asset.mimeType,
            upsert: false,
          })

      if (uploadError) throw uploadError

      const { error: saveError } = await supabase.rpc(
        'save_worker_document',
        {
          p_document_type: type,
          p_file_path: path,
          p_file_name: asset.name,
          p_mime_type: asset.mimeType,
          p_file_size: asset.size || fileBody.byteLength,
        }
      )

      if (saveError) {
        await supabase.storage
          .from('worker-documents')
          .remove([path])
        throw saveError
      }

      await loadDocuments()

      Alert.alert(
        'Document uploaded',
        'Your document has been uploaded and is now pending verification.'
      )
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Document upload failed:',
        error
      )

      Alert.alert(
        'Upload failed',
        error?.message || 'Please try again.'
      )
    } finally {
      setUploading(null)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>
            Loading your documents...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>TEMPSTAFF WORKER</Text>
        <Text style={styles.title}>Document verification</Text>
        <Text style={styles.subtitle}>
          Upload the required documents. Files are stored privately and
          reviewed by TempStaff.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Required documents: {DOCUMENTS.length}
          </Text>
          <Text style={styles.infoText}>
            JPG, PNG and PDF are supported. Maximum size is 10 MB per file.
          </Text>
        </View>

        {DOCUMENTS.map(document => {
          const item = latestByType.get(document.type)
          const isUploading = uploading === document.type

          return (
            <View key={document.type} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentText}>
                  <Text style={styles.documentTitle}>
                    {document.title}
                  </Text>
                  <Text style={styles.documentDescription}>
                    {document.description}
                  </Text>
                </View>

                <StatusBadge status={item?.status} />
              </View>

              {item?.file_name ? (
                <View style={styles.fileRow}>
                  <Text
                    style={styles.fileName}
                    numberOfLines={2}
                  >
                    {item.file_name}
                  </Text>
                </View>
              ) : null}

              {item?.status === 'rejected' &&
              item.rejection_reason ? (
                <View style={styles.rejectionCard}>
                  <Text style={styles.rejectionTitle}>
                    Changes required
                  </Text>
                  <Text style={styles.rejectionText}>
                    {item.rejection_reason}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  isUploading && styles.disabled,
                ]}
                onPress={() =>
                  void pickDocument(
                    document.type,
                    document.photoOnly
                  )
                }
                disabled={Boolean(uploading)}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.uploadButtonText}>
                    {item ? 'Replace document' : 'Upload document'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )
        })}

        <View style={styles.requirementCard}>
          <Text style={styles.requirementTitle}>
            Application requirement
          </Text>
          <Text style={styles.requirementText}>
            {requiredComplete
              ? 'All required document types are present. You can continue to the declaration and submission stage.'
              : 'Upload all six required document types before continuing.'}
          </Text>
        </View>

        <View style={styles.actions}>
          {onBack ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onBack}
              disabled={Boolean(uploading)}
            >
              <Text style={styles.secondaryText}>Back</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              !requiredComplete && styles.disabledButton,
            ]}
            onPress={() => {
              if (!requiredComplete) {
                Alert.alert(
                  'Documents incomplete',
                  'Please upload all six required documents before continuing.'
                )
                return
              }

              onContinue()
            }}
            disabled={Boolean(uploading)}
          >
            <Text style={styles.primaryText}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Your account stays restricted until TempStaff completes verification
          and approves your application.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatusBadge({
  status,
}: {
  status?: WorkerDocument['status']
}) {
  const label =
    status === 'approved'
      ? 'Approved'
      : status === 'rejected'
        ? 'Rejected'
        : status === 'pending'
          ? 'Pending'
          : 'Required'

  return (
    <View
      style={[
        styles.badge,
        status === 'approved'
          ? styles.badgeApproved
          : status === 'rejected'
            ? styles.badgeRejected
            : styles.badgePending,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  muted: {
    color: '#667085',
    fontSize: 14,
  },
  kicker: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 18,
  },
  infoCard: {
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: {
    color: '#067647',
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  documentText: {
    flex: 1,
  },
  documentTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  documentDescription: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgePending: {
    backgroundColor: '#F2F4F7',
  },
  badgeApproved: {
    backgroundColor: '#ECFDF3',
  },
  badgeRejected: {
    backgroundColor: '#FEF3F2',
  },
  badgeText: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '800',
  },
  fileRow: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
  },
  fileName: {
    color: '#344054',
    fontSize: 12,
  },
  rejectionCard: {
    backgroundColor: '#FEF3F2',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  rejectionTitle: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '800',
  },
  rejectionText: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  uploadButton: {
    backgroundColor: '#0F766E',
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.65,
  },
  requirementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  requirementTitle: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '800',
  },
  requirementText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 0.5,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  secondaryText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    color: '#98A2B3',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 20,
  },
})
