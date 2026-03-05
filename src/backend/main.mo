import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import List "mo:core/List";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";



actor {
  // Storage integration for blob and image storage
  include MixinStorage();

  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  type ConditionStatus = {
    foundation : Int;
    walls : Int;
    roof : Int;
  };

  public type Structure = {
    id : Text;
    name : Text;
    location : Text;
    era : Text;
    originalCondition : ConditionStatus;
    currentCondition : ConditionStatus;
    addedAt : Time.Time;
    addedBy : Principal;
  };

  public type DamageSeverity = { #low; #medium; #high };

  public type DamageCategory = {
    #foundation;
    #walls;
    #roof;
    #general;
  };

  public type DamageEntry = {
    id : Text;
    structureId : Text;
    date : Time.Time;
    category : DamageCategory;
    severity : DamageSeverity;
    description : Text;
    recordedAt : Time.Time;
    recordedBy : Principal;
  };

  module Structure {
    public func compare(a : Structure, b : Structure) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  module DamageEntry {
    public func compare(a : DamageEntry, b : DamageEntry) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  public type ImageDefect = {
    id : Text;
    structureId : Text;
    photoHash : Text;
    defectType : Text;
    severity : Text; // "low", "medium", "high"
    description : Text;
    detectedAt : Time.Time;
  };

  let structures = Map.empty<Text, Structure>();
  let damages = Map.empty<Text, DamageEntry>();
  let imageDefects = Map.empty<Text, [ImageDefect]>();

  public shared ({ caller }) func addStructure(structure : Structure) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add structures");
    };
    if (structures.containsKey(structure.id)) {
      Runtime.trap("Structure already exists");
    };
    structures.add(structure.id, structure);
  };

  public shared ({ caller }) func updateStructure(structure : Structure) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update structures");
    };
    if (not structures.containsKey(structure.id)) {
      Runtime.trap("Structure does not exist");
    };
    structures.add(structure.id, structure);
  };

  public shared ({ caller }) func deleteStructure(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete structures");
    };
    if (not structures.containsKey(id)) {
      Runtime.trap("Structure does not exist");
    };
    structures.remove(id);
  };

  public query ({ caller }) func getStructure(id : Text) : async Structure {
    switch (structures.get(id)) {
      case (null) { Runtime.trap("Structure does not exist") };
      case (?structure) { structure };
    };
  };

  public query ({ caller }) func listStructures() : async [Structure] {
    structures.values().toArray().sort();
  };

  public query ({ caller }) func listStructuresByLocation(location : Text) : async [Structure] {
    structures.values().toArray().filter(func(s) { s.location == location });
  };

  public shared ({ caller }) func addDamageEntry(entry : DamageEntry) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add damage entries");
    };
    if (damages.containsKey(entry.id)) {
      Runtime.trap("Damage entry already exists");
    };
    damages.add(entry.id, entry);
  };

  public shared ({ caller }) func updateDamageEntry(entry : DamageEntry) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update damage entries");
    };
    if (not damages.containsKey(entry.id)) {
      Runtime.trap("Damage entry does not exist");
    };
    damages.add(entry.id, entry);
  };

  public shared ({ caller }) func deleteDamageEntry(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete damage entries");
    };
    if (not damages.containsKey(id)) {
      Runtime.trap("Damage entry does not exist");
    };
    damages.remove(id);
  };

  public query ({ caller }) func getDamageEntry(id : Text) : async DamageEntry {
    switch (damages.get(id)) {
      case (null) { Runtime.trap("Damage entry does not exist") };
      case (?entry) { entry };
    };
  };

  public query ({ caller }) func listDamageEntriesByStructure(structureId : Text) : async [DamageEntry] {
    damages.values().toArray().filter(func(entry) { entry.structureId == structureId }).sort();
  };

  public query ({ caller }) func getPreservationRecommendations(category : DamageCategory) : async Text {
    switch (category) {
      case (#foundation) { "Regularly inspect and repair cracks. Ensure proper drainage to avoid water accumulation." };
      case (#walls) {
        "Maintain proper ventilation, monitor for cracks, and use compatible materials during repairs.";
      };
      case (#roof) {
        "Check for leaks and damaged materials. Maintain adequate slope for proper water drainage.";
      };
      case (_) { "No specific advice. Maintain regular inspections and address any issues promptly." };
    };
  };

  public type DamageSeverityCount = {
    low : Nat;
    medium : Nat;
    high : Nat;
  };

  public query ({ caller }) func getDamageSummary(structureId : Text) : async DamageSeverityCount {
    var lowCount : Nat = 0;
    var mediumCount : Nat = 0;
    var highCount : Nat = 0;

    for (entry in damages.values()) {
      if (entry.structureId == structureId) {
        switch (entry.severity) {
          case (#low) { lowCount += 1 };
          case (#medium) { mediumCount += 1 };
          case (#high) { highCount += 1 };
        };
      };
    };

    { low = lowCount; medium = mediumCount; high = highCount };
  };

  // ########## NEW IMAGE DEFECT FUNCTIONS ##########

  public shared ({ caller }) func saveImageDefects(structureId : Text, photoHash : Text, defects : [ImageDefect]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add image defects");
    };
    imageDefects.add(photoHash, defects);
  };

  public query ({ caller }) func getImageDefectsByStructure(structureId : Text) : async [ImageDefect] {
    let allDefects = List.empty<ImageDefect>();
    for ((photoHash, defects) in imageDefects.entries()) {
      if (not defects.isEmpty()) {
        // Only process non-empty defect arrays
        let nonEmptyDefects = defects.filter(
          func(defect) {
            defect.structureId == structureId;
          }
        );
        if (not nonEmptyDefects.isEmpty()) {
          allDefects.addAll(nonEmptyDefects.values());
        };
      };
    };
    allDefects.toArray();
  };

  public query ({ caller }) func getImageDefectsByPhoto(photoHash : Text) : async [ImageDefect] {
    switch (imageDefects.get(photoHash)) {
      case (null) { [] };
      case (?defects) { defects };
    };
  };

  public shared ({ caller }) func deleteImageDefectsForPhoto(photoHash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete image defects");
    };
    imageDefects.remove(photoHash);
  };
};
