import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ConditionStatus {
    foundation: bigint;
    roof: bigint;
    walls: bigint;
}
export type Time = bigint;
export interface ImageDefect {
    id: string;
    photoHash: string;
    defectType: string;
    structureId: string;
    detectedAt: Time;
    description: string;
    severity: string;
}
export interface DamageEntry {
    id: string;
    structureId: string;
    date: Time;
    description: string;
    recordedAt: Time;
    recordedBy: Principal;
    category: DamageCategory;
    severity: DamageSeverity;
}
export interface DamageSeverityCount {
    low: bigint;
    high: bigint;
    medium: bigint;
}
export interface Structure {
    id: string;
    era: string;
    name: string;
    originalCondition: ConditionStatus;
    addedAt: Time;
    addedBy: Principal;
    location: string;
    currentCondition: ConditionStatus;
}
export interface UserProfile {
    name: string;
}
export enum DamageCategory {
    foundation = "foundation",
    roof = "roof",
    general = "general",
    walls = "walls"
}
export enum DamageSeverity {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addDamageEntry(entry: DamageEntry): Promise<void>;
    addStructure(structure: Structure): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignRole(user: Principal, role: UserRole): Promise<void>;
    deleteDamageEntry(id: string): Promise<void>;
    deleteImageDefectsForPhoto(photoHash: string): Promise<void>;
    deleteStructure(id: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDamageEntry(id: string): Promise<DamageEntry>;
    getDamageSummary(structureId: string): Promise<DamageSeverityCount>;
    getImageDefectsByPhoto(photoHash: string): Promise<Array<ImageDefect>>;
    getImageDefectsByStructure(structureId: string): Promise<Array<ImageDefect>>;
    getPreservationRecommendations(category: DamageCategory): Promise<string>;
    getStructure(id: string): Promise<Structure>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserRole(): Promise<UserRole>;
    isCallerAdmin(): Promise<boolean>;
    listDamageEntriesByStructure(structureId: string): Promise<Array<DamageEntry>>;
    listStructures(): Promise<Array<Structure>>;
    listStructuresByLocation(location: string): Promise<Array<Structure>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveImageDefects(_structureId: string, photoHash: string, defects: Array<ImageDefect>): Promise<void>;
    updateDamageEntry(entry: DamageEntry): Promise<void>;
    updateStructure(structure: Structure): Promise<void>;
}
