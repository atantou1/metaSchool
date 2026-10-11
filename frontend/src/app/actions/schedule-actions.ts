"use server";

import { db } from "@/db"; // Assuming this is where db is initialized, let me adjust if not... Wait, I should check how db is initialized.
import { schedules, timetableSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function saveScheduleAction(name: string, description: string, slotsData: any) {
  try {
    const id = randomUUID();
    await db.insert(schedules).values({
      id,
      name,
      description,
      slotsData: JSON.stringify(slotsData),
      isPublished: false,
    });
    return { success: true, id };
  } catch (error) {
    console.error("Error saving schedule:", error);
    return { success: false, error: "Failed to save schedule" };
  }
}

export async function getSchedulesAction() {
  try {
    const allSchedules = await db.select().from(schedules).orderBy(schedules.createdAt);
    return { success: true, schedules: allSchedules };
  } catch (error) {
    console.error("Error getting schedules:", error);
    return { success: false, error: "Failed to fetch schedules" };
  }
}

export async function getScheduleByIdAction(id: string) {
  try {
    const schedule = await db.select().from(schedules).where(eq(schedules.id, id)).get();
    if (!schedule) {
      return { success: false, error: "Schedule not found" };
    }
    return { 
      success: true, 
      schedule: {
        ...schedule,
        slotsData: JSON.parse(schedule.slotsData)
      }
    };
  } catch (error) {
    console.error("Error getting schedule:", error);
    return { success: false, error: "Failed to fetch schedule" };
  }
}

export async function loadScheduleToActiveAction(id: string) {
  try {
    const schedule = await db.select().from(schedules).where(eq(schedules.id, id)).get();
    if (!schedule) {
      return { success: false, error: "Schedule not found" };
    }
    
    const slots = JSON.parse(schedule.slotsData);
    
    // Clear active timetable
    await db.delete(timetableSlots);
    
    // Insert all slots
    if (slots && slots.length > 0) {
      const mappedSlots = slots.map((s: any) => ({
        ...s,
        students: Array.isArray(s.students) ? JSON.stringify(s.students) : s.students,
      }));
      await db.insert(timetableSlots).values(mappedSlots);
    }
    return { success: true };
  } catch (error) {
    console.error("Error loading schedule to active:", error);
    return { success: false, error: "Failed to load schedule" };
  }
}

export async function deleteScheduleAction(id: string) {
  try {
    await db.delete(schedules).where(eq(schedules.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return { success: false, error: "Failed to delete schedule" };
  }
}

export async function updateScheduleAction(id: string, name: string, description: string, slotsData: any) {
  try {
    await db.update(schedules)
      .set({
        name,
        description,
        slotsData: JSON.stringify(slotsData),
        updatedAt: new Date().toISOString()
      })
      .where(eq(schedules.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error updating schedule:", error);
    return { success: false, error: "Failed to update schedule" };
  }
}

export async function clearTimetableAction() {
  try {
    await db.delete(timetableSlots);
    return { success: true };
  } catch (error) {
    console.error("Error clearing timetable:", error);
    return { success: false, error: "Failed to clear timetable" };
  }
}

export async function checkUnsavedChangesAction(activeScheduleId: string | null) {
  try {
    const currentSlots = await db.select().from(timetableSlots);
    
    if (!activeScheduleId) {
      return { success: true, hasChanges: currentSlots.length > 0 };
    }
    
    const schedule = await db.select().from(schedules).where(eq(schedules.id, activeScheduleId)).get();
    if (!schedule) {
      return { success: true, hasChanges: currentSlots.length > 0 };
    }
    
    const savedSlots = JSON.parse(schedule.slotsData);
    
    if (currentSlots.length !== savedSlots.length) {
      return { success: true, hasChanges: true };
    }
    
    const normalizeSlot = (s: any) => ({
      id: String(s.id),
      day: Number(s.day),
      period: Number(s.period),
      assignmentId: String(s.assignmentId),
      classId: String(s.classId),
      subGroupId: String(s.subGroupId),
      teacherId: String(s.teacherId),
      subjectId: String(s.subjectId),
      isSupport: Boolean(s.isSupport),
      layer: Number(s.layer || 1),
      isLocked: Boolean(s.isLocked),
      students: typeof s.students === 'string' ? s.students : (s.students ? JSON.stringify(s.students) : null)
    });

    const currentNormalized = currentSlots.map(normalizeSlot).sort((a: any, b: any) => a.id.localeCompare(b.id));
    const savedNormalized = savedSlots.map(normalizeSlot).sort((a: any, b: any) => a.id.localeCompare(b.id));

    const currentStr = JSON.stringify(currentNormalized);
    const savedStr = JSON.stringify(savedNormalized);
    
    if (currentStr !== savedStr) {
      // For debugging in the console
      console.log("Unsaved changes detected.");
      console.log("Current:", currentStr.substring(0, 100) + "...");
      console.log("Saved:", savedStr.substring(0, 100) + "...");
    }
    
    return { success: true, hasChanges: currentStr !== savedStr };
  } catch (error) {
    console.error("Error checking unsaved changes:", error);
    return { success: false, hasChanges: true }; // Assume changes on error to be safe
  }
}
