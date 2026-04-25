import { Image } from 'expo-image';
import { FlatList, Pressable, Text, View } from 'react-native';
import { getPublicUrl } from '../../lib/supabase';
import type { RoutePhoto } from '../../types';

interface CommunityPhotosProps {
  photos: RoutePhoto[];
  onAdd?: () => void;
  onPress?: (photo: RoutePhoto) => void;
}

export function CommunityPhotos({ photos, onAdd, onPress }: CommunityPhotosProps) {
  if (photos.length === 0 && !onAdd) return null;

  return (
    <View className="gap-y-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-gray-700">
          Photos {photos.length > 0 && `(${photos.length})`}
        </Text>
        {onAdd && (
          <Pressable onPress={onAdd}>
            <Text className="text-brand-600 text-sm font-medium">+ Add photo</Text>
          </Pressable>
        )}
      </View>

      {photos.length === 0 ? (
        <Pressable
          onPress={onAdd}
          className="h-24 bg-gray-50 rounded-xl items-center justify-center border border-dashed border-gray-200"
        >
          <Text className="text-2xl mb-1">📷</Text>
          <Text className="text-xs text-gray-400">Be the first to add a photo</Text>
        </Pressable>
      ) : (
        <FlatList
          horizontal
          data={photos}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => onPress?.(item)}>
              <Image
                source={{ uri: getPublicUrl('route-photos', item.storage_path) }}
                style={{ width: 100, height: 100, borderRadius: 12 }}
                contentFit="cover"
              />
              {item.caption && (
                <Text
                  className="text-xs text-gray-500 mt-1"
                  style={{ width: 100 }}
                  numberOfLines={1}
                >
                  {item.caption}
                </Text>
              )}
            </Pressable>
          )}
          ListFooterComponent={
            onAdd ? (
              <Pressable
                onPress={onAdd}
                className="w-24 h-24 rounded-xl bg-gray-50 border border-dashed border-gray-200 items-center justify-center"
              >
                <Text className="text-2xl">+</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}
