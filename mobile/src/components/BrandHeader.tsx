import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

export function BrandHeader() {
    return (
        <View style={styles.row}>
            <Image
                source={require("@/assets/images/logo.webp")}
                style={styles.logo}
                contentFit="contain"
                transition={100}
            />
            <Text style={styles.brand}>
                Lowkey
                <Text style={styles.brandGold}>Sports</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: spacing.two
    },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 8
    },
    brand: {
        color: colors.text,
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: 0.3
    },
    brandGold: {
        color: colors.gold
    }
});