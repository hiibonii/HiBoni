"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoryEditor from "@/components/StoryEditor";
import { getStoryById } from "@/lib/firestore";
import { StoryDoc } from "@/types";
import { notFound } from "next/navigation";

export default function EditStoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<StoryDoc | null | undefined>(undefined);

  useEffect(() => {
    getStoryById(id).then(setStory);
  }, [id]);

  if (story === undefined) return <p className="p-12">Loading...</p>;
  if (story === null) notFound();

  return (
    <ProtectedRoute>
      <StoryEditor mode="edit" initialData={story} />
    </ProtectedRoute>
  );
}
