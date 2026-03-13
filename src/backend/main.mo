import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Storage integration for blob and image storage
  include MixinStorage();

  // Access control state (var)
  var accessControlState = AccessControl.initState();

  // Access control integration (uses var)
  include MixinAuthorization(accessControlState);

  // ############# Data Types #############

  public type UserProfile = {
    name : Text;
  };

  public type ConditionStatus = {
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

  public type ImageDefect = {
    id : Text;
    structureId : Text;
    photoHash : Text;
    defectType : Text;
    severity : Text; // "low", "medium", "high"
    description : Text;
    detectedAt : Time.Time;
  };

  // ############# Stable Data Storage #############

  var userProfiles = Map.empty<Principal, UserProfile>();
  var structures = Map.empty<Text, Structure>();
  var damages = Map.empty<Text, DamageEntry>();
  var imageDefects = Map.empty<Text, [ImageDefect]>();

  // ######### AUTHORIZATION FUNCTIONS #########

  public query ({ caller }) func getUserRole() : async AccessControl.UserRole {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access role data");
    };
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignRole(user : Principal, role : AccessControl.UserRole) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  // User Profiles
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Guests cannot query profiles. Register as regular user.");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only regular users can save profiles. Anonymous users not allowed.");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  // Structure CRUD Operations
  public shared ({ caller }) func addStructure(structure : Structure) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only regular users can add structures. Anonymous users not allowed.");
    };
    if (structures.containsKey(structure.id)) {
      Runtime.trap("Structure already exists");
    };
    structures.add(structure.id, structure);
  };

  public shared ({ caller }) func updateStructure(structure : Structure) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only regular users can update structures. Anonymous users not allowed.");
    };
    if (not structures.containsKey(structure.id)) {
      Runtime.trap("Structure does not exist");
    };
    structures.add(structure.id, structure);
  };

  public shared ({ caller }) func deleteStructure(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only regular users can delete structures. Anonymous users not allowed.");
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
    structures.values().toArray();
  };

  public query ({ caller }) func listStructuresByLocation(location : Text) : async [Structure] {
    structures.values().toArray().filter(func(s) { s.location == location });
  };

  // Damage CRUD Operations
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
      Runtime.trap("Unauthorized: Only regular users can update damage entries. Anonymous users not allowed.");
    };
    if (not damages.containsKey(entry.id)) {
      Runtime.trap("Damage entry does not exist");
    };
    damages.add(entry.id, entry);
  };

  public shared ({ caller }) func deleteDamageEntry(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only regular users can delete damage entries. Anonymous users not allowed.");
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
    damages.values().toArray().filter(func(entry) { entry.structureId == structureId });
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

  // Image Defect Operations
  public shared ({ caller }) func saveImageDefects(_structureId : Text, photoHash : Text, defects : [ImageDefect]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only regular users can add image defects. Anonymous users not allowed.");
    };
    imageDefects.add(photoHash, defects);
  };

  public query ({ caller }) func getImageDefectsByStructure(structureId : Text) : async [ImageDefect] {
    let allDefects = List.empty<ImageDefect>();
    for (defects in imageDefects.values()) {
      for (defect in defects.values()) {
        if (defect.structureId == structureId) {
          allDefects.add(defect);
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
      Runtime.trap("Unauthorized: Only regular users can delete image defects. Anonymous users not allowed.");
    };
    imageDefects.remove(photoHash);
  };
};
