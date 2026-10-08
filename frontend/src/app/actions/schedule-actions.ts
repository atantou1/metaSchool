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
