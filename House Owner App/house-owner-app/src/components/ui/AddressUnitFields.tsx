import { View, StyleSheet } from 'react-native';
import { GhostInput } from '@/components/ui/GhostInput';

export type AddressUnitValue = {
  flatNo: string;
  building: string;
  area: string;
};

type Props = {
  value: AddressUnitValue;
  onChange: (next: AddressUnitValue) => void;
};

export function AddressUnitFields({ value, onChange }: Props) {
  const set = (key: keyof AddressUnitValue, text: string) =>
    onChange({ ...value, [key]: text });

  return (
    <View style={styles.wrap}>
      <GhostInput
        label="Flat / house no."
        value={value.flatNo}
        onChangeText={(t) => set('flatNo', t)}
      />
      <GhostInput
        label="Building / society name"
        value={value.building}
        onChangeText={(t) => set('building', t)}
      />
      <GhostInput
        label="Area / locality"
        value={value.area}
        onChangeText={(t) => set('area', t)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
});
