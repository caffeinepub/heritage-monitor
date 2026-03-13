import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import AccessControl "authorization/access-control";

module {
  // Types from original (old) version
  type OldUserProfile = {
    name : Text;
  };

  type OldConditionStatus = {
    foundation : Int;
    walls : Int;
    roof : Int;
  };

  type OldStructure = {
    id : Text;
    name : Text;
    location : Text;
    era : Text;
    originalCondition : OldConditionStatus;
    currentCondition : OldConditionStatus;
    addedAt : Time.Time;
    addedBy : Principal;
  };

  type OldDamageCategory = {
    #foundation;
    #walls;
    #roof;
    #general;
  };

  type OldDamageSeverity = { #low; #medium; #high };

  type OldDamageEntry = {
    id : Text;
    structureId : Text;
    date : Time.Time;
    category : OldDamageCategory;
    severity : OldDamageSeverity;
    description : Text;
    recordedAt : Time.Time;
    recordedBy : Principal;
  };

  type OldImageDefect = {
    id : Text;
    structureId : Text;
    photoHash : Text;
    defectType : Text;
    severity : Text;
    description : Text;
    detectedAt : Time.Time;
  };

  type OldAccessControlState = AccessControl.AccessControlState;

  // Old actor state - includes both heap maps and stable arrays from previous version
  type OldActor = {
    // Heap maps (may be empty since they were not stable)
    userProfiles : Map.Map<Principal, OldUserProfile>;
    structures : Map.Map<Text, OldStructure>;
    damages : Map.Map<Text, OldDamageEntry>;
    imageDefects : Map.Map<Text, [OldImageDefect]>;
    accessControlState : OldAccessControlState;
    // Stable arrays from previous version (this is where the real data is)
    stableStructures : [(Text, OldStructure)];
    stableDamages : [(Text, OldDamageEntry)];
    stableImageDefects : [(Text, [OldImageDefect])];
  };

  // New (target) types
  type NewUserProfile = OldUserProfile;
  type NewStructure = OldStructure;
  type NewDamageEntry = OldDamageEntry;
  type NewImageDefect = OldImageDefect;
  type NewAccessControlState = AccessControl.AccessControlState;

  type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
    structures : Map.Map<Text, NewStructure>;
    damages : Map.Map<Text, NewDamageEntry>;
    imageDefects : Map.Map<Text, [NewImageDefect]>;
    accessControlState : NewAccessControlState;
  };

  public func run(old : OldActor) : NewActor {
    // Start with the heap maps (may have data from new-style storage)
    let newStructures = old.structures;
    let newDamages = old.damages;
    let newImageDefects = old.imageDefects;

    // Also restore from stable arrays (old-style storage) - this ensures data
    // from previous versions that used stable vars is not lost
    for ((k, v) in old.stableStructures.vals()) {
      if (not newStructures.containsKey(k)) {
        newStructures.add(k, v);
      };
    };
    for ((k, v) in old.stableDamages.vals()) {
      if (not newDamages.containsKey(k)) {
        newDamages.add(k, v);
      };
    };
    for ((k, v) in old.stableImageDefects.vals()) {
      if (not newImageDefects.containsKey(k)) {
        newImageDefects.add(k, v);
      };
    };

    {
      userProfiles = old.userProfiles;
      structures = newStructures;
      damages = newDamages;
      imageDefects = newImageDefects;
      accessControlState = old.accessControlState;
    };
  };
};
