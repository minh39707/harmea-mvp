import { useEffect, useRef, useState } from 'react';
import type { Design, Item, View, StateSetter } from '../../shared/types';
import { photo as readPhoto } from './photo';
import { loadAssets } from './asset-store';

export function usePhotoAsset({
  view,
  setDraft,
  setGallery,
  setError
}: {
  view: View;
  setDraft: StateSetter<Design>;
  setGallery: StateSetter<'sample' | 'preview'>;
  setError: StateSetter<string>;
}) {
  const original = useRef<{ thumbnail: string; blob: Blob } | null>(null),
    sequence = useRef(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    sequence.current++;
    setLoading(false);
    return () => {
      sequence.current++;
    };
  }, [view]);
  async function photo(file: File | undefined) {
    if (!file) return;
    const request = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const result = await readPhoto(file);
      if (request !== sequence.current) return;
      original.current = { thumbnail: result.thumbnail, blob: result.original };
      setDraft(d => ({
        ...d,
        photo: result.thumbnail,
        photoWidth: result.width,
        photoHeight: result.height,
        crop: result.crop
      }));
      setGallery('preview');
    } catch (error) {
      if (request === sequence.current)
        setError(error instanceof Error ? error.message : 'Không đọc được ảnh.');
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }
  async function restore(item: Item) {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const assets = item.assetKey ? await loadAssets(item.assetKey) : null;
      if (request !== sequence.current) return false;
      original.current = assets ? { thumbnail: item.design.photo, blob: assets.photo } : null;
      return true;
    } catch {
      if (request !== sequence.current) return false;
      original.current = null;
      return true;
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }
  function originalFor(draft: Design) {
    return original.current?.thumbnail === draft.photo ? original.current.blob : null;
  }
  function clearPhoto() {
    original.current = null;
    sequence.current++;
    setLoading(false);
    setDraft(d => ({
      ...d,
      photo: '',
      photoWidth: 0,
      photoHeight: 0,
      crop: { x: 0, y: 0, width: 1, height: 1 }
    }));
  }
  return { photo, restore, originalFor, clearPhoto, loading };
}
