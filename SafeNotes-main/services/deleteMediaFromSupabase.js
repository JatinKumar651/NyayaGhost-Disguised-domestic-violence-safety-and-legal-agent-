import { deleteMediaFromSupabase } from '../../services/deleteMediaFromSupabase';

// ...

const handleDeleteAll = () => {
  if (media.length === 0) {
    Alert.alert('Nothing to delete', 'Your journal is already empty.');
    return;
  }

  Alert.alert(
    'Delete all media?',
    'This will permanently delete all journal entries. This action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const item of media) {
              await FileSystem.deleteAsync(item.uri, { idempotent: true });

              // Delete from Supabase if publicUrl exists
              if (item.publicUrl) {
                // Supabase URL structure: https://xyz.supabase.co/storage/v1/object/public/bucketName/path/to/file
                // Extract path after bucket name in URL
                const urlParts = item.publicUrl.split('/');
                const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME);
                if (bucketIndex !== -1) {
                  const filePath = urlParts.slice(bucketIndex + 1).join('/');
                  await deleteMediaFromSupabase(filePath);
                }
              }
            }
            setMedia([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete all media.');
          }
        },
      },
    ]
  );
};
