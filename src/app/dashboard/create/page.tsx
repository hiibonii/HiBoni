"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import StoryEditor from "@/components/StoryEditor";

export default function CreateStoryPage() {
  return (
    <ProtectedRoute>
      <StoryEditor mode="create" />
    </ProtectedRoute>
  );
}
