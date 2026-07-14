'use server';

import type { LifecycleState } from '@kihub/governance-core';
import { revalidatePath } from 'next/cache';
import {
  decideApproval,
  getCurrentActor,
  recordReview,
  submitForReview,
  transitionLifecycle,
  updateGovernanceMetadata,
} from './governance';

export async function submitForReviewAction(formData: FormData) {
  const artifactId = String(formData.get('artifactId') ?? '');
  const actor = await getCurrentActor();
  if (!actor || !artifactId) return;
  await submitForReview(artifactId, actor);
  revalidatePath(`/artifacts/${artifactId}`);
}

export async function transitionLifecycleAction(formData: FormData) {
  const artifactId = String(formData.get('artifactId') ?? '');
  const to = String(formData.get('to') ?? '') as LifecycleState;
  const actor = await getCurrentActor();
  if (!actor || !artifactId || !to) return;
  await transitionLifecycle(artifactId, to, actor);
  revalidatePath(`/artifacts/${artifactId}`);
}

export async function updateGovernanceMetadataAction(formData: FormData) {
  const artifactId = String(formData.get('artifactId') ?? '');
  const actor = await getCurrentActor();
  if (!actor || !artifactId) return;

  const riskLevel = String(formData.get('riskLevel') ?? '');
  await updateGovernanceMetadata(
    artifactId,
    {
      businessOwner: String(formData.get('businessOwner') ?? '') || null,
      technicalOwner: String(formData.get('technicalOwner') ?? '') || null,
      riskLevel: (riskLevel as 'low' | 'medium' | 'high') || null,
      internalNotes: String(formData.get('internalNotes') ?? '') || null,
      featured: formData.get('featured') === 'on',
    },
    actor,
  );
  revalidatePath(`/artifacts/${artifactId}`);
}

export async function recordReviewAction(formData: FormData) {
  const artifactId = String(formData.get('artifactId') ?? '');
  const actor = await getCurrentActor();
  if (!actor || !artifactId) return;

  await recordReview(
    artifactId,
    {
      type: String(formData.get('type') ?? '') as never,
      decision: String(formData.get('decision') ?? '') as never,
      comments: String(formData.get('comments') ?? '') || null,
      requiredChanges: String(formData.get('requiredChanges') ?? '') || null,
      riskLevel: (String(formData.get('riskLevel') ?? '') as 'low' | 'medium' | 'high') || null,
      expiryDate: String(formData.get('expiryDate') ?? ''),
    },
    actor,
  );
  revalidatePath(`/artifacts/${artifactId}`);
}

export async function decideApprovalAction(formData: FormData) {
  const artifactId = String(formData.get('artifactId') ?? '');
  const decision = String(formData.get('decision') ?? '') as 'approved' | 'rejected';
  const actor = await getCurrentActor();
  if (!actor || !artifactId || !decision) return;
  await decideApproval(artifactId, decision, actor);
  revalidatePath(`/artifacts/${artifactId}`);
}
