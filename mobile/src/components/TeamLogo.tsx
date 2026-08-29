import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export function TeamLogo({
    name,
    logo,
    size = 48
}: {
    name: string;
    logo: string | null;
    size?: number;
}) {
    const [failed, setFailed] = useState(false);
    const rounded = Math.round(size * 0.25);

    if (logo && !failed) {
        return (
            <Image
                source={{ uri: logo }}
                style={{ width: size, height: size, borderRadius: rounded }}
                contentFit="contain"
                transition={150}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <View
            style={[
                styles.fallback,
                { width: size, height: size, borderRadius: rounded }
            ]}
        >
            <Text style={[styles.fallbackText, { fontSize: Math.max(11, size * 0.28) }]}>
                {name.slice(0, 2).toUpperCase()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    fallback: {
        backgroundColor: colors.surface2,
        alignItems: "center",
        justifyContent: "center"
    },
    fallbackText: {
        color: colors.gold,
        fontWeight: "800"
    }
});