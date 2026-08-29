import { PropsWithChildren, ReactNode } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle
} from "react-native";
import { colors, radii, spacing } from "@/constants/theme";

export function AppText({
    children,
    style,
    muted = false,
    small = false,
    bold = false,
    numberOfLines,
    ...rest
}: PropsWithChildren<{
    style?: StyleProp<TextStyle>;
    muted?: boolean;
    small?: boolean;
    bold?: boolean;
    numberOfLines?: number;
}>) {
    return (
        <Text
            {...rest}
            numberOfLines={numberOfLines}
            style={[
                {
                    color: muted ? colors.textMuted : colors.text,
                    fontSize: small ? 13 : 15,
                    fontWeight: bold ? "700" : "400",
                    lineHeight: small ? 18 : 22
                },
                style
            ]}
        >
            {children}
        </Text>
    );
}

export function Screen({
    children,
    style
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
    return (
        <ScrollView style={[styles.screen, style]} contentContainerStyle={styles.screenContent}>
            {children}
        </ScrollView>
    );
}

export function Card({
    children,
    style,
    onPress
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
    if (onPress) {
        return (
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
                {children}
            </Pressable>
        );
    }
    return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: PropsWithChildren) {
    return (
        <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{children}</Text>
        </View>
    );
}

export function ScreenSection({
  title,
  children,
  style
}: PropsWithChildren<{ title: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.section, style]}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </View>
  );
}

export function Hero({ children, compact = false }: PropsWithChildren<{ compact?: boolean }>) {
    return (
        <View style={[styles.hero, compact && styles.heroCompact]}>
            {children}
        </View>
    );
}

export function GoldButton({
    children,
    onPress,
    disabled = false,
    busy = false,
    style
}: PropsWithChildren<{ onPress?: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle> }>) {
    const blocked = disabled || busy;
    return (
        <Pressable
            onPress={onPress}
            disabled={blocked}
            style={({ pressed }) => [
                styles.btn,
                styles.btnGold,
                blocked && styles.btnDisabled,
                pressed && !blocked && styles.btnPressed,
                style
            ]}
        >
            {busy ? (
                <ActivityIndicator size="small" color={colors.bg} />
            ) : (
                <Text style={styles.btnGoldText}>{children}</Text>
            )}
        </Pressable>
    );
}

export function OutlineButton({
    children,
    onPress,
    disabled = false,
    busy = false,
    style
}: PropsWithChildren<{ onPress?: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle> }>) {
    const blocked = disabled || busy;
    return (
        <Pressable
            onPress={onPress}
            disabled={blocked}
            style={({ pressed }) => [
                styles.btn,
                styles.btnOutline,
                blocked && styles.btnDisabled,
                pressed && !blocked && styles.btnPressed,
                style
            ]}
        >
            {busy ? (
                <ActivityIndicator size="small" color={colors.text} />
            ) : (
                <Text style={styles.btnOutlineText}>{children}</Text>
            )}
        </Pressable>
    );
}

export function DangerButton({
    children,
    onPress,
    disabled = false,
    style
}: PropsWithChildren<{ onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }>) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.btn,
                styles.btnDanger,
                disabled && styles.btnDisabled,
                pressed && !disabled && styles.btnPressed,
                style
            ]}
        >
            <Text style={[styles.btnOutlineText, { color: colors.dangerLight }]}>{children}</Text>
        </Pressable>
    );
}

export function TextField({
    label,
    error,
    ...props
}: TextInputProps & { label: string; error?: string | null }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                placeholderTextColor={colors.textMuted}
                {...props}
                style={[
                    styles.input,
                    props.multiline && { minHeight: 120, textAlignVertical: "top" },
                    props.style
                ]}
            />
            {error && <Text style={styles.formError}>{error}</Text>}
        </View>
    );
}

export function Message({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
    return (
        <Text style={kind === "error" ? styles.formError : styles.adminSummary}>{children}</Text>
    );
}

export function StatusBadge({ tone, children }: { tone: string; children: ReactNode }) {
    const style =
        tone === "published" || tone === "won" || tone === "admin"
            ? styles.statusActive
            : styles.statusMuted;
    return <View style={[styles.statusBadge, style]}>{children}</View>;
}

export function PickBadge({ pick, children }: { pick: string; children: ReactNode }) {
    const toneStyle =
        pick === "home" ? styles.pickHome : pick === "away" ? styles.pickAway : styles.pickDraw;
    return <View style={[styles.pickBadge, toneStyle]}>{children}</View>;
}

export function Chip({
    children,
    onPress,
    active = false
}: PropsWithChildren<{ onPress?: () => void; active?: boolean }>) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.btnPressed
            ]}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
        </Pressable>
    );
}

export function Loader({ text = "Chargement…" }: { text?: string }) {
    return (
        <View style={styles.loader}>
            <ActivityIndicator color={colors.gold} />
            <AppText muted style={{ marginTop: spacing.two }}>
                {text}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg
    },
    screenContent: {
        padding: spacing.three,
        paddingBottom: spacing.five
    },
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: spacing.three
    },
    pressed: {
        opacity: 0.92
    },
    sectionTitleRow: {
        marginBottom: spacing.two
    },
    section: {
        paddingVertical: spacing.three
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "800",
        marginBottom: spacing.three,
        borderLeftWidth: 4,
        borderLeftColor: colors.gold,
        paddingLeft: spacing.two
    },
    hero: {
        paddingVertical: spacing.four
    },
    heroCompact: {
        paddingVertical: spacing.three
    },
    btn: {
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center"
    },
    btnGold: {
        backgroundColor: colors.gold
    },
    btnGoldText: {
        color: "#241a02",
        fontWeight: "700"
    },
    btnOutline: {
        borderWidth: 1,
        borderColor: colors.border
    },
    btnOutlineText: {
        color: colors.text,
        fontWeight: "700"
    },
    btnDanger: {
        borderWidth: 1,
        borderColor: "rgba(255, 82, 82, 0.5)",
        backgroundColor: "rgba(255, 82, 82, 0.12)"
    },
    btnDisabled: {
        opacity: 0.5
    },
    btnPressed: {
        opacity: 0.85
    },
    field: {
        marginBottom: spacing.three
    },
    fieldLabel: {
        color: colors.text,
        fontWeight: "600",
        marginBottom: spacing.one
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.three,
        paddingVertical: 12,
        color: colors.text,
        fontSize: 15
    },
    formError: {
        color: "#ff7a7a",
        marginTop: spacing.two
    },
    adminSummary: {
        color: colors.successLight,
        marginTop: spacing.two
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radii.pill,
        fontSize: 12,
        fontWeight: "700"
    },
    statusActive: {
        backgroundColor: "rgba(46, 204, 113, 0.15)",
        color: colors.successLight
    },
    statusMuted: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.textMuted
    },
    pickBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radii.pill,
        fontWeight: "700"
    },
    pickHome: {
        backgroundColor: "rgba(47, 107, 255, 0.18)",
        borderWidth: 1,
        borderColor: "rgba(47, 107, 255, 0.4)"
    },
    pickAway: {
        backgroundColor: "rgba(139, 92, 246, 0.18)",
        borderWidth: 1,
        borderColor: "rgba(139, 92, 246, 0.4)"
    },
    pickDraw: {
        backgroundColor: "rgba(230, 181, 49, 0.16)",
        borderWidth: 1,
        borderColor: "rgba(230, 181, 49, 0.4)"
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.pill,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)"
    },
    chipActive: {
        backgroundColor: "rgba(47, 107, 255, 0.25)",
        borderColor: colors.blue
    },
    chipText: {
        color: colors.textMuted,
        fontWeight: "600"
    },
    chipTextActive: {
        color: colors.white
    },
    loader: {
        paddingVertical: spacing.four,
        alignItems: "center"
    }
});