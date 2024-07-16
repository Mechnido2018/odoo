import { getKwArgs, serverState } from "@web/../tests/web_test_helpers";
import { mailModels } from "@mail/../tests/mail_test_helpers";

export class ResPartner extends mailModels.ResPartner {
    /**
     * @override
     * @type {typeof mailModels.ResPartner["prototype"]["_search_for_channel_invite_to_store"]}
     */
    _search_for_channel_invite_to_store(ids, store, channel_id) {
        /** @type {import("mock_models").DiscussChannel} */
        const DiscussChannel = this.env["discuss.channel"];
        /** @type {import("mock_models").DiscussChannelMember} */
        const DiscussChannelMember = this.env["discuss.channel.member"];
        /** @type {import("mock_models").LivechatChannel} */
        const LivechatChannel = this.env["im_livechat.channel"];
        /** @type {import("mock_models").ResLang} */
        const ResLang = this.env["res.lang"];
        /** @type {import("mock_models").ResPartner} */
        const ResPartner = this.env["res.partner"];
        /** @type {import("mock_models").ResUsers} */
        const ResUsers = this.env["res.users"];

        super._search_for_channel_invite_to_store(ids, store, channel_id);
        const [channel] = DiscussChannel._filter([["id", "=", channel_id]]);
        if (channel.channel_type !== "livechat") {
            return;
        }
        const activeLivechatPartners = LivechatChannel._filter([])
            .map(({ available_operator_ids }) => available_operator_ids)
            .flat()
            .map((userId) => ResUsers._filter([["id", "=", userId]])[0].partner_id);
        const partners = ResPartner._filter([["id", "in", ids]]);
        for (const partner of partners) {
            const data = {
                id: partner.id,
                invite_by_self_count: DiscussChannelMember.search_count([
                    ["partner_id", "=", partner.id],
                    ["create_uid", "=", serverState.userId],
                ]),
                is_available: activeLivechatPartners.includes(partner.id),
            };
            if (partner.lang) {
                data.lang_name = ResLang.search_read([["code", "=", partner.lang]])[0].name;
            }
            store.add("res.partner", data);
        }
    }
    /**
     * @override
     * @type {typeof mailModels.ResPartner["prototype"]["_to_store"]}
     */
    _to_store(ids, store, fields) {
        const kwargs = getKwArgs(arguments, "id", "store", "fields");
        fields = kwargs.fields;

        /** @type {import("mock_models").ResPartner} */
        const ResPartner = this.env["res.partner"];

        super._to_store(...arguments);
        if (fields && fields.includes("user_livechat_username")) {
            super._to_store(
                ResPartner.browse(ids)
                    .filter((partner) => !partner.user_livechat_username)
                    .map((partner) => partner.id),
                store,
                ["name"]
            );
        }
    }
}
